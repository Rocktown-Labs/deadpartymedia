import { createIdentityDatabase } from "@dpmedia/auth";
import { invitation } from "@dpmedia/auth/schema";
import { artists, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { and, asc, count, desc, eq, isNull, like, notInArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";
import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getOffsetFromPage,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "../../../lib/music/admin/table-state";

const INVITATION_SORT_FIELDS = ["createdAt", "emailAddress", "role"] as const;

const USER_SORT_FIELDS = ["createdAt", "name", "email", "role"] as const;

const ARTIST_SORT_FIELDS = ["createdAt", "name", "genre", "email", "claimed"] as const;

type InvitationSortField = (typeof INVITATION_SORT_FIELDS)[number];

type UserSortField = (typeof USER_SORT_FIELDS)[number];

type ArtistSortField = (typeof ARTIST_SORT_FIELDS)[number];

function getInvitationRole(invitation: { publicMetadata?: unknown }) {
  return ((invitation.publicMetadata as Record<string, string>)?.role || "fan").toLowerCase();
}

function getInvitationCreatedAt(invitation: { createdAt?: Date | number | string | null }) {
  if (typeof invitation.createdAt === "number") {
    return invitation.createdAt;
  }

  if (typeof invitation.createdAt === "string") {
    return new Date(invitation.createdAt).getTime() || 0;
  }

  return invitation.createdAt?.getTime() ?? 0;
}

export const loadAdminUsers = new Hono<AppEnv>().get(
  "/admin/users",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const params = c.req.query();

    const query = params.search?.trim() || "";

    const invPage = parsePageParam(params.inv_page);

    const usrPage = parsePageParam(params.usr_page);

    const artPage = parsePageParam(params.art_page);

    const invSort = parseSortParam<InvitationSortField>(
      params.inv_sort,
      INVITATION_SORT_FIELDS,
      "createdAt",
    );

    const usrSort = parseSortParam<UserSortField>(params.usr_sort, USER_SORT_FIELDS, "createdAt");

    const artSort = parseSortParam<ArtistSortField>(
      params.art_sort,
      ARTIST_SORT_FIELDS,
      "createdAt",
    );

    const invOrder = parseSortOrderParam(params.inv_order, "desc");

    const usrOrder = parseSortOrderParam(params.usr_order, "desc");

    const artOrder = parseSortOrderParam(params.art_order, "desc");

    const userRoleCondition = notInArray(users.role, ["artmaker", "arts_admin", "arts_writer"]);

    const userSearchCondition = query
      ? or(
          like(users.email, `%${query}%`),
          like(users.firstName, `%${query}%`),
          like(users.lastName, `%${query}%`),
        )
      : undefined;

    const userConditions = userSearchCondition
      ? and(userRoleCondition, userSearchCondition)
      : userRoleCondition;

    const artistConditions = query
      ? or(like(artists.name, `%${query}%`), like(artists.email, `%${query}%`))
      : undefined;

    const userCountQuery = db.select({ total: count() }).from(users);

    const userRowsQuery = db
      .select({
        clerkId: users.clerkId,
        createdAt: users.createdAt,
        email: users.email,
        firstName: users.firstName,
        id: users.id,
        lastName: users.lastName,
        onboardingComplete: users.onboardingComplete,
        role: users.role,
      })
      .from(users);

    const artistCountQuery = db.select({ total: count() }).from(artists);

    const artistRowsQuery = db
      .select({
        claimed: artists.claimed,
        claimedById: artists.claimedById,
        createdAt: artists.createdAt,
        email: artists.email,
        genre: artists.genre,
        id: artists.id,
        location: artists.location,
        name: artists.name,
        slug: artists.slug,
      })
      .from(artists);

    const [
      localUsersTotalRows,
      localUsers,
      localArtistsTotalRows,
      localArtists,
      invitationsResult,
    ] = await Promise.all([
      userCountQuery.where(userConditions),
      userRowsQuery
        .where(userConditions)
        .orderBy(
          usrSort === "name"
            ? usrOrder === "asc"
              ? asc(users.firstName)
              : desc(users.firstName)
            : usrSort === "email"
              ? usrOrder === "asc"
                ? asc(users.email)
                : desc(users.email)
              : usrSort === "role"
                ? usrOrder === "asc"
                  ? asc(users.role)
                  : desc(users.role)
                : usrOrder === "asc"
                  ? asc(users.createdAt)
                  : desc(users.createdAt),
          usrSort === "name"
            ? usrOrder === "asc"
              ? asc(users.lastName)
              : desc(users.lastName)
            : desc(users.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(getOffsetFromPage(usrPage, ADMIN_PAGE_SIZE)),
      artistConditions ? artistCountQuery.where(artistConditions) : artistCountQuery,
      (artistConditions ? artistRowsQuery.where(artistConditions) : artistRowsQuery)
        .orderBy(
          artSort === "name"
            ? artOrder === "asc"
              ? asc(artists.name)
              : desc(artists.name)
            : artSort === "genre"
              ? artOrder === "asc"
                ? asc(artists.genre)
                : desc(artists.genre)
              : artSort === "email"
                ? artOrder === "asc"
                  ? asc(artists.email)
                  : desc(artists.email)
                : artSort === "claimed"
                  ? artOrder === "asc"
                    ? asc(artists.claimed)
                    : desc(artists.claimed)
                  : artOrder === "asc"
                    ? asc(artists.createdAt)
                    : desc(artists.createdAt),
          desc(artists.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(getOffsetFromPage(artPage, ADMIN_PAGE_SIZE)),
      createIdentityDatabase(c.env.AUTH_DB)
        .select()
        .from(invitation)
        .where(and(eq(invitation.app, "music"), isNull(invitation.acceptedAt)))
        .then((rows) => ({
          data: rows.map((row) => ({
            id: row.id,
            emailAddress: row.email,
            createdAt: row.createdAt.getTime(),
            publicMetadata: { role: row.role },
            status: row.expiresAt > new Date() ? "pending" : "expired",
          })),
        })),
    ]);

    const allInvitations = [...invitationsResult.data]

      .toSorted((left, right) => {
        let comparison = 0;

        if (invSort === "emailAddress") {
          comparison = left.emailAddress.localeCompare(right.emailAddress);
        } else if (invSort === "role") {
          comparison = getInvitationRole(left).localeCompare(getInvitationRole(right));
        } else {
          comparison = getInvitationCreatedAt(left) - getInvitationCreatedAt(right);
        }

        return invOrder === "asc" ? comparison : comparison * -1;
      });

    const invitationTotal = allInvitations.length;

    const pagedInvitations = allInvitations.slice(
      getOffsetFromPage(invPage, ADMIN_PAGE_SIZE),
      getOffsetFromPage(invPage, ADMIN_PAGE_SIZE) + ADMIN_PAGE_SIZE,
    );

    const localUsersTotal = Number(localUsersTotalRows[0]?.total ?? 0);

    const localArtistsTotal = Number(localArtistsTotalRows[0]?.total ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );
    const currentSearchParamsString = currentSearchParams.toString();
    return c.json({
      params,
      query,
      invPage,
      usrPage,
      artPage,
      invOrder,
      usrOrder,
      artOrder,
      localUsers,
      localArtists,
      invitationTotal,
      pagedInvitations,
      localUsersTotal,
      localArtistsTotal,
      currentSearchParamsString,
    });
  },
);
