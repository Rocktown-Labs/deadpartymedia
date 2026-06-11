"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { canManageUsers } from "@/lib/auth/access";
import type { Roles } from "@/types/globals";
import { revalidatePath } from "next/cache";
import { inviteUserSchema } from "@/lib/validations/user";
import { upsertUserAuthState } from "@/lib/auth/user-state";
import { buildInvitationRedirectUrl } from "@/lib/auth/invitations";
import { db } from "@/lib/db";
import { artists, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { getErrorMessage, getNestedErrorMessage } from "@/lib/utils/error";

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

export async function inviteUser(
  email: string,
  role: Roles,
  redirectUrl?: string,
  localUserProfileId?: number,
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can invite users");
  }

  // Validate input
  const validationResult = inviteUserSchema.safeParse({ email, role });

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const client = await clerkClient();

  const defaultRedirectUrl = getInviteRedirectUrl(validatedData.role);

  try {
    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    const publicMetadata: Record<string, unknown> = {
      role: validatedData.role,
    };
    if (localUserProfileId) {
      publicMetadata.localUserProfileId = String(localUserProfileId);
    }

    if (validatedData.role === "super_admin" || validatedData.role === "writer") {
      publicMetadata.onboardingComplete = true;
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: validatedData.email,
      publicMetadata,
      redirectUrl: buildInvitationRedirectUrl(redirectUrl || defaultRedirectUrl),
    });

    revalidatePath("/admin/users");
    return { invitation, success: true };
  } catch (error) {
    return {
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to send invitation"),
      success: false,
    };
  }
}

export async function createUserProfileStub(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can create profiles");
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

  revalidatePath("/admin/users");
  return {
    profile: created,
    success: true,
  };
}

export async function createArtistProfileStub(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can create artist profiles");
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
  const slug = await ensureUniqueSlug(generateSlug(name), undefined, "artists");

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

  revalidatePath("/admin/users");
  revalidatePath("/admin/artists");
  return { artist: createdArtist, success: true };
}

export async function createProfile(formData: FormData) {
  const profileTypeRaw = formData.get("profileType");
  const profileType = profileTypeRaw === "artist" ? "artist" : "user";

  if (profileType === "artist") {
    return createArtistProfileStub(formData);
  }
  return createUserProfileStub(formData);
}

export async function updateLocalUserEmail(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can update profiles");
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
  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateArtistEmail(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can update artists");
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
  revalidatePath("/admin/users");
  revalidatePath("/admin/artists");
  return { success: true };
}

export async function inviteUserProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can invite users");
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
  revalidatePath("/admin/users");
  return invitationResult;
}

export async function inviteArtistProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can invite artists");
  }

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "Invalid artist id", success: false };
  }

  const [artist] = await db
    .select({ email: artists.email, id: artists.id })
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);

  if (!artist) {
    return { error: "Artist not found", success: false };
  }
  if (!artist.email || isPlaceholderEmail(artist.email)) {
    return { error: "Set a real email before sending invite", success: false };
  }

  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({
      emailAddress: artist.email,
      publicMetadata: {
        artistId: String(artist.id),
        role: "artist",
      },
      redirectUrl: buildInvitationRedirectUrl(`/sign-up?role=artist&artistId=${artist.id}`),
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/artists");
    return { success: true };
  } catch (error) {
    return {
      error:
        getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to send artist invitation"),
      success: false,
    };
  }
}

export async function deleteUser(userId: string) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can delete users");
  }

  const client = await clerkClient();

  try {
    await client.users.deleteUser(userId);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to delete user"),
      success: false,
    };
  }
}

export async function deleteLocalUserProfile(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can delete profiles");
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
    revalidatePath("/admin/users");
    return { success: true };
  }

  // Fallback to Clerk delete for real users.
  return deleteUser(profile.clerkId);
}

export async function revokeInvitation(invitationId: string) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can revoke invitations");
  }

  const client = await clerkClient();

  try {
    await client.invitations.revokeInvitation(invitationId);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to revoke invitation"),
      success: false,
    };
  }
}

export async function updateUserRole(userId: string, role: Roles) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can change user roles");
  }

  const validRoles: Roles[] = ["artist", "fan", "super_admin", "writer"];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const client = await clerkClient();

  try {
    // Get current user metadata to preserve existing values
    const user = await client.users.getUser(userId);
    const currentMetadata = user.publicMetadata || {};

    // For super_admin/writer, onboarding is complete immediately.
    // For artist/fan, onboarding is reset and must be completed for the new role.
    const publicMetadata: Record<string, unknown> = {
      ...currentMetadata,
      onboardingComplete: role === "super_admin" || role === "writer",
      role,
    };

    await client.users.updateUserMetadata(userId, {
      publicMetadata,
    });

    const primaryEmail =
      user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error("User has no email address");
    }

    await upsertUserAuthState({
      clerkId: user.id,
      email: primaryEmail,
      firstName: user.firstName,
      imageUrl: user.imageUrl,
      lastName: user.lastName,
      onboardingComplete: Boolean(publicMetadata.onboardingComplete),
      role,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return {
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to update user role"),
      success: false,
    };
  }
}

export async function updateLocalUserRole(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canManageUsers())) {
    throw new Error("Unauthorized: Only super admins can change user roles");
  }

  const idRaw = formData.get("id");
  const roleRaw = formData.get("role");
  const id = typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
  const role =
    typeof roleRaw === "string" && ["writer", "super_admin", "fan", "artist"].includes(roleRaw)
      ? (roleRaw as Roles)
      : null;

  if (!Number.isInteger(id) || id <= 0 || !role) {
    return { error: "Invalid role update payload", success: false };
  }

  const [profile] = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!profile) {
    return { error: "User profile not found", success: false };
  }

  const isPlaceholder =
    profile.clerkId.startsWith("local_placeholder:") ||
    profile.clerkId.startsWith("wp_placeholder:");

  if (!isPlaceholder) {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(profile.clerkId);
      const currentMetadata = clerkUser.publicMetadata || {};
      await client.users.updateUserMetadata(profile.clerkId, {
        publicMetadata: {
          ...currentMetadata,
          onboardingComplete: role === "writer" || role === "super_admin",
          role,
        },
      });
    } catch (error) {
      console.error("Failed to sync role change to Clerk:", error);
      return {
        error: "Failed to update role in Clerk (Identity Server).",
        success: false,
      };
    }
  }

  await db
    .update(users)
    .set({
      onboardingComplete: role === "writer" || role === "super_admin",
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  revalidatePath("/admin/users");
  return { success: true };
}
