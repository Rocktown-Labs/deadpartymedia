import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { withOperationContext } from "@/lib/logger/context";
import { roleOrDefault } from "@/lib/auth/role";

function parseLocalUserProfileId(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).localUserProfileId;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function POST(req: NextRequest) {
  const log = getRequestLogger(req);
  try {
    const evt = await verifyWebhook(req);

    // Handle user.created event
    if (evt.type === "user.created") {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        image_url,
        public_metadata,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        log.error(
          { operation: "webhook_user_created", userId: id },
          "No primary email found for user"
        );
        return NextResponse.json({ error: "No primary email found" }, { status: 400 });
      }

      const localUserProfileId = parseLocalUserProfileId(public_metadata);
      const linkedLocalProfile = localUserProfileId
        ? await db
            .select({
              id: users.id,
              clerkId: users.clerkId,
              role: users.role,
              onboardingComplete: users.onboardingComplete,
            })
            .from(users)
            .where(eq(users.id, localUserProfileId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : null;

      if (linkedLocalProfile && linkedLocalProfile.clerkId !== id) {
        await db
          .update(posts)
          .set({ authorId: id, updatedAt: new Date() })
          .where(eq(posts.authorId, linkedLocalProfile.clerkId));
        await db.delete(users).where(eq(users.id, linkedLocalProfile.id));
      }

      const role = roleOrDefault(
        (public_metadata as Record<string, unknown>)?.role ??
          linkedLocalProfile?.role,
        "fan"
      );
      const onboardingComplete =
        (public_metadata as Record<string, unknown>)?.onboardingComplete === true ||
        linkedLocalProfile?.onboardingComplete === true;

      // Upsert user to make webhook retries idempotent.
      await db
        .insert(users)
        .values({
          clerkId: id,
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          role,
          onboardingComplete,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
            role,
            onboardingComplete,
            updatedAt: new Date(),
          },
        });

      withOperationContext(log, "webhook_user_created", "user", id).info(
        { userId: id },
        "User synced to database"
      );
    }

    // Handle user.updated event
    if (evt.type === "user.updated") {
      const {
        id,
        email_addresses,
        first_name,
        last_name,
        image_url,
        public_metadata,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        log.error(
          { operation: "webhook_user_updated", userId: id },
          "No primary email found for user"
        );
        return NextResponse.json({ error: "No primary email found" }, { status: 400 });
      }

      const localUserProfileId = parseLocalUserProfileId(public_metadata);
      const linkedLocalProfile = localUserProfileId
        ? await db
            .select({
              id: users.id,
              clerkId: users.clerkId,
              role: users.role,
              onboardingComplete: users.onboardingComplete,
            })
            .from(users)
            .where(eq(users.id, localUserProfileId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : null;

      if (linkedLocalProfile && linkedLocalProfile.clerkId !== id) {
        await db
          .update(posts)
          .set({ authorId: id, updatedAt: new Date() })
          .where(eq(posts.authorId, linkedLocalProfile.clerkId));
        await db.delete(users).where(eq(users.id, linkedLocalProfile.id));
      }

      const role = roleOrDefault(
        (public_metadata as Record<string, unknown>)?.role ??
          linkedLocalProfile?.role,
        "fan"
      );
      const onboardingComplete =
        (public_metadata as Record<string, unknown>)?.onboardingComplete === true ||
        linkedLocalProfile?.onboardingComplete === true;

      // Upsert user to make update deliveries idempotent even when row is missing.
      await db
        .insert(users)
        .values({
          clerkId: id,
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          role,
          onboardingComplete,
        })
        .onConflictDoUpdate({
          target: users.clerkId,
          set: {
            email: primaryEmail,
            firstName: first_name || null,
            lastName: last_name || null,
            imageUrl: image_url || null,
            role,
            onboardingComplete,
            updatedAt: new Date(),
          },
        });

      withOperationContext(log, "webhook_user_updated", "user", id).info(
        { userId: id },
        "User updated in database"
      );
    }

    // Handle user.deleted event
    if (evt.type === "user.deleted") {
      const { id } = evt.data;

      // Delete user from database
      await db.delete(users).where(eq(users.clerkId, id!));

      withOperationContext(log, "webhook_user_deleted", "user", id).info(
        { userId: id },
        "User deleted from database"
      );
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    log.error(
      { error: sanitizeError(err), operation: "webhook_verification" },
      "Error verifying webhook"
    );
    return NextResponse.json({ error: "Error verifying webhook" }, { status: 400 });
  }
}
