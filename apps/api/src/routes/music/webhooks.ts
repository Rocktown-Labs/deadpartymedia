import { verifyWebhook } from "@clerk/backend/webhooks";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { posts, users } from "@dpmedia/db/schema";
import { getDb } from "../../db";
import { roleOrDefault } from "../../lib/role";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/webhooks/route.ts.
 * Keeps syncing Clerk users into the database until the Phase 4 auth
 * cutover (MIGRATION_PLAN.md). Failure responses match the Next.js
 * route exactly: any verification/handling error maps to 400
 * `{ error: "Error verifying webhook" }`.
 */
export const musicWebhooksRoutes = new Hono<AppEnv>();

function parseLocalUserProfileId(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const value = (metadata as Record<string, unknown>).localUserProfileId;
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

musicWebhooksRoutes.post("/webhooks", async (c) => {
  try {
    const evt = await verifyWebhook(c.req.raw, {
      signingSecret: c.env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
    const db = getDb(c.env);

    // Handle user.created event
    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        console.error("No primary email found for user", {
          operation: "webhook_user_created",
          userId: id,
        });
        return c.json({ error: "No primary email found" }, 400);
      }

      const localUserProfileId = parseLocalUserProfileId(public_metadata);
      const linkedLocalProfile = localUserProfileId
        ? await db
            .select({
              clerkId: users.clerkId,
              id: users.id,
              onboardingComplete: users.onboardingComplete,
              role: users.role,
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
        (public_metadata as Record<string, unknown>)?.role ?? linkedLocalProfile?.role,
        "fan",
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
          imageUrl: image_url || null,
          lastName: last_name || null,
          onboardingComplete,
          role,
        })
        .onConflictDoUpdate({
          set: {
            email: primaryEmail,
            firstName: first_name || null,
            imageUrl: image_url || null,
            lastName: last_name || null,
            onboardingComplete,
            role,
            updatedAt: new Date(),
          },
          target: users.clerkId,
        });

      console.log("User synced to database", {
        operation: "webhook_user_created",
        userId: id,
      });
    }

    // Handle user.updated event
    if (evt.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        console.error("No primary email found for user", {
          operation: "webhook_user_updated",
          userId: id,
        });
        return c.json({ error: "No primary email found" }, 400);
      }

      const localUserProfileId = parseLocalUserProfileId(public_metadata);
      const linkedLocalProfile = localUserProfileId
        ? await db
            .select({
              clerkId: users.clerkId,
              id: users.id,
              onboardingComplete: users.onboardingComplete,
              role: users.role,
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
        (public_metadata as Record<string, unknown>)?.role ?? linkedLocalProfile?.role,
        "fan",
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
          imageUrl: image_url || null,
          lastName: last_name || null,
          onboardingComplete,
          role,
        })
        .onConflictDoUpdate({
          set: {
            email: primaryEmail,
            firstName: first_name || null,
            imageUrl: image_url || null,
            lastName: last_name || null,
            onboardingComplete,
            role,
            updatedAt: new Date(),
          },
          target: users.clerkId,
        });

      console.log("User updated in database", {
        operation: "webhook_user_updated",
        userId: id,
      });
    }

    // Handle user.deleted event
    if (evt.type === "user.deleted") {
      const { id } = evt.data;
      if (!id) {
        return c.json({ error: "Webhook payload missing user id" }, 400);
      }

      // Delete user from database
      await db.delete(users).where(eq(users.clerkId, id));

      console.log("User deleted from database", {
        operation: "webhook_user_deleted",
        userId: id,
      });
    }

    return c.json({ received: true }, 200);
  } catch (error) {
    console.error("Error verifying webhook", { error, operation: "webhook_verification" });
    return c.json({ error: "Error verifying webhook" }, 400);
  }
});
