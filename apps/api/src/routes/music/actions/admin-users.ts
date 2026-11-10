import { createIdentityDatabase } from "@dpmedia/auth";
import { invitation } from "@dpmedia/auth/schema";
import { zValidator } from "@hono/zod-validator";
import { and } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getIdentity, requireAuth, requireRole, setMembershipRoles } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { sendInvitation } from "../../../lib/invitations";
import { hasMusicRole } from "../../../lib/music-access";

import { inviteUserSchema } from "@dpmedia/contracts";
import { artists, users } from "@dpmedia/db/schema";
import { eq } from "drizzle-orm";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
type Roles = "super_admin" | "writer" | "artist" | "venue" | "fan";
function AdminUsersActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.deadpartymedia.local";

  const LOCAL_PLACEHOLDER_PREFIX = "local_placeholder:";

  const VALID_INVITE_ROLES = new Set<Roles>(["writer", "super_admin", "artist"]);

  function normalizeName(input: string): string {
    return input.trim().replaceAll(/\s+/g, " ").slice(0, 150);
  }

  function parseNameParts(displayName: string): { firstName: string; lastName: string | null } {
    const words = normalizeName(displayName).split(" ").filter(Boolean);
    if (words.length === 0) {
      return { firstName: "Profile", lastName: null };
    }

    return {
      firstName: words[0] ?? "Profile",
      lastName: words.slice(1).join(" ") || null,
    };
  }

  function normalizeEmailOrNull(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
    return isValid ? normalized : null;
  }

  function isPlaceholderEmail(email: string): boolean {
    return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
  }

  function buildPlaceholderClerkId(base: string): string {
    const slug = generateSlug(base) || "profile";
    return `${LOCAL_PLACEHOLDER_PREFIX}${slug}-${Date.now()}`;
  }

  function buildPlaceholderEmail(base: string): string {
    const slug = generateSlug(base) || "profile";
    return `${slug}-${Date.now()}@${PLACEHOLDER_EMAIL_DOMAIN}`;
  }

  function normalizeCreateRole(roleInput: FormDataEntryValue | null): Roles {
    if (typeof roleInput !== "string") {
      return "writer";
    }
    if (roleInput === "writer" || roleInput === "super_admin" || roleInput === "fan") {
      return roleInput;
    }
    return "writer";
  }

  function getInviteRedirectUrl(role: Roles): string {
    if (role === "writer") {
      return "/sign-up?role=writer";
    }
    if (role === "super_admin") {
      return "/sign-up?role=super_admin";
    }
    if (role === "artist") {
      return "/sign-up?role=artist";
    }
    if (role === "fan") {
      return "/sign-up?role=fan";
    }
    return "/sign-up";
  }

  async function inviteUser(
    email: string,
    role: Roles,
    _redirectUrl?: string,
    localUserProfileId?: number,
  ) {
    requireRole(c, ["super_admin"]);
    const parsed = inviteUserSchema.parse({ email, role });
    await sendInvitation(c.env, {
      app: "music",
      invitedBy: requireAuth(c).userId,
      email: parsed.email,
      role: parsed.role,
      localProfileId: localUserProfileId,
    });
    return { success: true as const };
  }

  async function createUserProfileStub(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can create profiles",
      });
    }

    const displayNameRaw = formData.get("displayName");
    const displayName = typeof displayNameRaw === "string" ? normalizeName(displayNameRaw) : "";
    if (!displayName) {
      return { error: "Display name is required", success: false };
    }

    const role = normalizeCreateRole(formData.get("role"));
    const inputEmail =
      typeof formData.get("email") === "string" ? (formData.get("email") as string) : null;
    const email = normalizeEmailOrNull(inputEmail) ?? buildPlaceholderEmail(displayName);
    const { firstName, lastName } = parseNameParts(displayName);
    const clerkId = buildPlaceholderClerkId(displayName);

    const [created] = await db
      .insert(users)
      .values({
        clerkId,
        email,
        firstName,
        imageUrl: null,
        lastName,
        onboardingComplete: role === "writer" || role === "super_admin",
        role,
      })
      .returning({
        clerkId: users.clerkId,
        email: users.email,
        firstName: users.firstName,
        id: users.id,
        lastName: users.lastName,
        role: users.role,
      });

    return {
      profile: created,
      success: true,
    };
  }

  async function createArtistProfileStub(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can create artist profiles",
      });
    }

    const nameRaw = formData.get("displayName");
    const name = typeof nameRaw === "string" ? normalizeName(nameRaw) : "";
    if (!name) {
      return { error: "Artist name is required", success: false };
    }

    const locationRaw = formData.get("location");
    const location =
      typeof locationRaw === "string" && normalizeName(locationRaw).length > 0
        ? normalizeName(locationRaw)
        : "Unknown";

    const genreRaw = formData.get("genre");
    const genre =
      typeof genreRaw === "string" &&
      ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"].includes(genreRaw)
        ? genreRaw
        : "OTHER";

    const emailRaw =
      typeof formData.get("email") === "string" ? (formData.get("email") as string) : null;
    const email = normalizeEmailOrNull(emailRaw);
    const slug = await ensureUniqueSlug(db, generateSlug(name), undefined, "artists");

    const [createdArtist] = await db
      .insert(artists)
      .values({
        bio: "Profile pending update.",
        claimed: false,
        claimedById: null,
        email,
        genre: genre as "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER",
        image: null,
        instagram: null,
        location,
        name,
        phoneNumber: null,
        slug,
        spotifyArtistId: null,
        spotifyUrl: null,
        tiktok: null,
        twitter: null,
        website: null,
      })
      .returning({
        email: artists.email,
        genre: artists.genre,
        id: artists.id,
        location: artists.location,
        name: artists.name,
      });

    return { artist: createdArtist, success: true };
  }

  async function createProfile(formData: FormData) {
    const profileTypeRaw = formData.get("profileType");
    const profileType = profileTypeRaw === "artist" ? "artist" : "user";

    if (profileType === "artist") {
      return createArtistProfileStub(formData);
    }
    return createUserProfileStub(formData);
  }

  async function updateLocalUserEmail(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can update profiles",
      });
    }

    const idRaw = formData.get("id");
    const emailRaw = formData.get("email");
    const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
    const email = typeof emailRaw === "string" ? normalizeEmailOrNull(emailRaw) : null;

    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid profile id", success: false };
    }
    if (!email) {
      return { error: "A valid email is required", success: false };
    }

    await db.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, id));

    return { success: true };
  }

  async function updateArtistEmail(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can update artists",
      });
    }

    const idRaw = formData.get("id");
    const emailRaw = formData.get("email");
    const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
    const email = typeof emailRaw === "string" ? normalizeEmailOrNull(emailRaw) : null;

    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid artist id", success: false };
    }
    if (!email) {
      return { error: "A valid email is required", success: false };
    }

    await db.update(artists).set({ email, updatedAt: new Date() }).where(eq(artists.id, id));

    return { success: true };
  }

  async function inviteUserProfile(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Unauthorized: Only super admins can invite users" });
    }

    const idRaw = formData.get("id");
    const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid profile id", success: false };
    }

    const [profile] = await db
      .select({
        clerkId: users.clerkId,
        email: users.email,
        id: users.id,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!profile) {
      return { error: "Profile not found", success: false };
    }

    const role = profile.role as Roles;
    if (!VALID_INVITE_ROLES.has(role)) {
      return { error: "Only writer/admin/artist profiles can be invited", success: false };
    }

    const email = profile.email.trim().toLowerCase();
    if (!normalizeEmailOrNull(email) || isPlaceholderEmail(email)) {
      return { error: "Set a real email before sending invite", success: false };
    }

    const invitationResult = await inviteUser(email, role, getInviteRedirectUrl(role), profile.id);

    return invitationResult;
  }

  async function inviteArtistProfile(formData: FormData) {
    requireRole(c, ["super_admin"]);
    const id = Number(formData.get("id"));
    const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
    if (!artist?.email || isPlaceholderEmail(artist.email))
      return { success: false as const, error: "Set a real email before sending an invitation" };
    await sendInvitation(c.env, {
      app: "music",
      email: artist.email,
      role: "artist",
      artistId: id,
      invitedBy: requireAuth(c).userId,
    });
    return { success: true as const };
  }

  async function deleteUser(userId: string) {
    const caller = requireRole(c, ["super_admin"]);
    if (caller.userId === userId)
      throw new HTTPException(400, { message: "You cannot delete your own profile" });
    await getIdentity(c.env, userId);
    await setMembershipRoles(c.env, userId, "music", []);
    await db.delete(users).where(eq(users.clerkId, userId));
    return { success: true as const };
  }

  async function deleteLocalUserProfile(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can delete profiles",
      });
    }

    const idRaw = formData.get("id");
    const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "Invalid profile id", success: false };
    }

    const [profile] = await db
      .select({ clerkId: users.clerkId, id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!profile) {
      return { error: "Profile not found", success: false };
    }

    // Local placeholders can be removed directly from DB.
    if (profile.clerkId.startsWith(LOCAL_PLACEHOLDER_PREFIX)) {
      await db.delete(users).where(eq(users.id, id));

      return { success: true };
    }

    // Fallback to Clerk delete for real users.
    return deleteUser(profile.clerkId);
  }

  async function revokeInvitation(invitationId: string) {
    requireRole(c, ["super_admin"]);
    await createIdentityDatabase(c.env.AUTH_DB)
      .delete(invitation)
      .where(and(eq(invitation.id, invitationId), eq(invitation.app, "music")));
    return { success: true as const };
  }

  async function resendInvitation(invitationId: string, email?: string, role?: Roles) {
    requireRole(c, ["super_admin"]);
    const identityDb = createIdentityDatabase(c.env.AUTH_DB);
    const [existing] = await identityDb
      .select()
      .from(invitation)
      .where(and(eq(invitation.id, invitationId), eq(invitation.app, "music")))
      .limit(1);
    if (!existing || existing.acceptedAt)
      return { success: false as const, error: "Pending invitation not found" };
    await sendInvitation(c.env, {
      app: "music",
      email: email || existing.email,
      role: role || existing.role,
      invitedBy: requireAuth(c).userId,
      artistId: existing.artistId ?? undefined,
      localProfileId: existing.localProfileId ?? undefined,
    });
    await revokeInvitation(invitationId);
    return { success: true as const };
  }

  async function updateUserRole(userId: string, role: Roles) {
    requireRole(c, ["super_admin"]);
    await getIdentity(c.env, userId);
    await setMembershipRoles(c.env, userId, "music", [role]);
    await db
      .update(users)
      .set({
        role,
        onboardingComplete: role === "writer" || role === "super_admin",
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId));
    return { success: true as const };
  }

  async function updateLocalUserRole(formData: FormData) {
    requireRole(c, ["super_admin"]);
    const id = Number(formData.get("id"));
    const role = z
      .enum(["super_admin", "writer", "artist", "venue", "fan"])
      .parse(formData.get("role"));
    const [profile] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!profile) return { success: false as const, error: "Profile not found" };
    if (
      !profile.clerkId.startsWith("local_placeholder:") &&
      !profile.clerkId.startsWith("wp_placeholder:")
    )
      await setMembershipRoles(c.env, profile.clerkId, "music", [role]);
    await db
      .update(users)
      .set({
        role,
        onboardingComplete: role === "writer" || role === "super_admin",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    return { success: true as const };
  }
  return {
    inviteUser,
    createUserProfileStub,
    createArtistProfileStub,
    createProfile,
    updateLocalUserEmail,
    updateArtistEmail,
    inviteUserProfile,
    inviteArtistProfile,
    deleteUser,
    deleteLocalUserProfile,
    revokeInvitation,
    resendInvitation,
    updateUserRole,
    updateLocalUserRole,
  };
}
export const adminUsersActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/users/inviteUser",
    zValidator(
      "json",
      z.object({
        email: z.string(),
        role: z.enum(["super_admin", "writer", "artist", "venue", "fan"]),
        redirectUrl: z.string().optional(),
        localUserProfileId: z.number().int().optional(),
      }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminUsersActions(c).inviteUser(
          input.email,
          input.role,
          input.redirectUrl,
          input.localUserProfileId,
        )) ?? null,
      );
    },
  )
  .post(
    "/admin/users/createUserProfileStub",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).createUserProfileStub(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/createArtistProfileStub",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).createArtistProfileStub(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/createProfile",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).createProfile(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/updateLocalUserEmail",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).updateLocalUserEmail(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/updateArtistEmail",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).updateArtistEmail(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/inviteUserProfile",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).inviteUserProfile(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/inviteArtistProfile",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).inviteArtistProfile(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/deleteUser",
    zValidator("json", z.object({ userId: z.string() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).deleteUser(input.userId)) ?? null);
    },
  )
  .post(
    "/admin/users/deleteLocalUserProfile",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).deleteLocalUserProfile(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/users/revokeInvitation",
    zValidator("json", z.object({ invitationId: z.string() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).revokeInvitation(input.invitationId)) ?? null);
    },
  )
  .post(
    "/admin/users/resendInvitation",
    zValidator(
      "json",
      z.object({
        invitationId: z.string(),
        email: z.string().optional(),
        role: z.enum(["super_admin", "writer", "artist", "venue", "fan"]).optional(),
      }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminUsersActions(c).resendInvitation(
          input.invitationId,
          input.email,
          input.role,
        )) ?? null,
      );
    },
  )
  .post(
    "/admin/users/updateUserRole",
    zValidator(
      "json",
      z.object({
        userId: z.string(),
        role: z.enum(["super_admin", "writer", "artist", "venue", "fan"]),
      }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).updateUserRole(input.userId, input.role)) ?? null);
    },
  )
  .post(
    "/admin/users/updateLocalUserRole",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminUsersActions(c).updateLocalUserRole(input.formData)) ?? null);
    },
  );
