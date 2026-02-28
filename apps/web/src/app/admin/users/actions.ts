"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { canManageUsers } from "@/lib/auth/access";
import { type Roles } from "@/types/globals";
import { revalidatePath } from "next/cache";
import { inviteUserSchema } from "@/lib/validations/user";
import { upsertUserAuthState } from "@/lib/auth/user-state";
import { db } from "@/lib/db";
import { artists, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";

const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.deadpartymedia.local";
const LOCAL_PLACEHOLDER_PREFIX = "local_placeholder:";
const VALID_INVITE_ROLES: Roles[] = ["writer", "super_admin", "artist"];

function normalizeName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 150);
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
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
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
  if (typeof roleInput !== "string") return "writer";
  if (roleInput === "writer" || roleInput === "super_admin" || roleInput === "fan") {
    return roleInput;
  }
  return "writer";
}

function getInviteRedirectUrl(role: Roles): string {
  if (role === "writer") return "/sign-up?role=writer";
  if (role === "artist") return "/sign-up?role=artist";
  if (role === "fan") return "/sign-up?role=fan";
  return "/sign-up";
}

export async function inviteUser(
  email: string,
  role: Roles,
  redirectUrl?: string,
  localUserProfileId?: number
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
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const client = await clerkClient();

  // Determine redirect URL based on role
  let defaultRedirectUrl = "/sign-up";
  if (validatedData.role === "writer") {
    defaultRedirectUrl = "/sign-up?role=writer";
  } else if (validatedData.role === "artist") {
    defaultRedirectUrl = "/sign-up?role=artist";
  } else if (validatedData.role === "fan") {
    defaultRedirectUrl = "/sign-up?role=fan";
  }

  try {
    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    const publicMetadata: Record<string, any> = {
      role: validatedData.role,
    };
    if (localUserProfileId) {
      publicMetadata.localUserProfileId = String(localUserProfileId);
    }

    if (
      validatedData.role === "super_admin" ||
      validatedData.role === "writer"
    ) {
      publicMetadata.onboardingComplete = true;
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: validatedData.email,
      redirectUrl: redirectUrl || defaultRedirectUrl,
      publicMetadata,
    });

    revalidatePath("/admin/users");
    return { success: true, invitation };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: "Display name is required" };
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
      lastName,
      role,
      onboardingComplete: role === "writer" || role === "super_admin",
      imageUrl: null,
    })
    .returning({
      id: users.id,
      clerkId: users.clerkId,
      email: users.email,
      role: users.role,
      firstName: users.firstName,
      lastName: users.lastName,
    });

  revalidatePath("/admin/users");
  return {
    success: true,
    profile: created,
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
    return { success: false, error: "Artist name is required" };
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

  const emailRaw = typeof formData.get("email") === "string" ? (formData.get("email") as string) : null;
  const email = normalizeEmailOrNull(emailRaw);
  const slug = await ensureUniqueSlug(generateSlug(name), undefined, "artists");

  const [createdArtist] = await db
    .insert(artists)
    .values({
      name,
      slug,
      bio: "Profile pending update.",
      location,
      genre: genre as "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER",
      email,
      claimed: false,
      image: null,
      spotifyUrl: null,
      spotifyArtistId: null,
      instagram: null,
      twitter: null,
      tiktok: null,
      website: null,
      phoneNumber: null,
      claimedById: null,
    })
    .returning({
      id: artists.id,
      name: artists.name,
      genre: artists.genre,
      location: artists.location,
      email: artists.email,
    });

  revalidatePath("/admin/users");
  revalidatePath("/admin/artists");
  return { success: true, artist: createdArtist };
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
    return { success: false, error: "Invalid profile id" };
  }
  if (!email) {
    return { success: false, error: "A valid email is required" };
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
    return { success: false, error: "Invalid artist id" };
  }
  if (!email) {
    return { success: false, error: "A valid email is required" };
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
    return { success: false, error: "Invalid profile id" };
  }

  const [profile] = await db
    .select({
      id: users.id,
      clerkId: users.clerkId,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!profile) {
    return { success: false, error: "Profile not found" };
  }

  const role = profile.role as Roles;
  if (!VALID_INVITE_ROLES.includes(role)) {
    return { success: false, error: "Only writer/admin/artist profiles can be invited" };
  }

  const email = profile.email.trim().toLowerCase();
  if (!normalizeEmailOrNull(email) || isPlaceholderEmail(email)) {
    return { success: false, error: "Set a real email before sending invite" };
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
    return { success: false, error: "Invalid artist id" };
  }

  const [artist] = await db
    .select({ id: artists.id, email: artists.email })
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);

  if (!artist) {
    return { success: false, error: "Artist not found" };
  }
  if (!artist.email || isPlaceholderEmail(artist.email)) {
    return { success: false, error: "Set a real email before sending invite" };
  }

  const client = await clerkClient();
  try {
    await client.invitations.createInvitation({
      emailAddress: artist.email,
      redirectUrl: `/sign-up?role=artist&artistId=${artist.id}`,
      publicMetadata: {
        role: "artist",
        artistId: String(artist.id),
      },
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/artists");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: "Invalid profile id" };
  }

  const [profile] = await db
    .select({ id: users.id, clerkId: users.clerkId })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!profile) {
    return { success: false, error: "Profile not found" };
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
  } catch (error: any) {
    return { success: false, error: error.message };
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

    // Build public metadata with role update
    const publicMetadata: Record<string, any> = {
      ...currentMetadata,
      role,
    };

    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    if (role === "super_admin" || role === "writer") {
      publicMetadata.onboardingComplete = true;
    } else {
      // For non-admin roles (artist/fan), reset onboardingComplete to false
      // so users must complete onboarding for their new role
      publicMetadata.onboardingComplete = false;
    }

    await client.users.updateUserMetadata(userId, {
      publicMetadata,
    });

    const primaryEmail =
      user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
        ?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error("User has no email address");
    }

    await upsertUserAuthState({
      clerkId: user.id,
      email: primaryEmail,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role,
      onboardingComplete: Boolean(publicMetadata.onboardingComplete),
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
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
    return { success: false, error: "Invalid role update payload" };
  }

  await db
    .update(users)
    .set({
      role,
      onboardingComplete: role === "writer" || role === "super_admin",
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));

  revalidatePath("/admin/users");
  return { success: true };
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
