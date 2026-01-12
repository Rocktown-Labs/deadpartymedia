import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);

    // Handle user.created event
    if (evt.type === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        console.error("No primary email found for user:", id);
        return NextResponse.json({ error: "No primary email found" }, { status: 400 });
      }

      // Insert user into database
      await db.insert(users).values({
        clerkId: id,
        email: primaryEmail,
        firstName: first_name || null,
        lastName: last_name || null,
        imageUrl: image_url || null,
      });

      console.log(`User synced to database: ${id} (${primaryEmail})`);
    }

    // Handle user.updated event
    if (evt.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === evt.data.primary_email_address_id,
      )?.email_address;

      if (!primaryEmail) {
        console.error("No primary email found for user:", id);
        return NextResponse.json({ error: "No primary email found" }, { status: 400 });
      }

      // Update user in database
      await db
        .update(users)
        .set({
          email: primaryEmail,
          firstName: first_name || null,
          lastName: last_name || null,
          imageUrl: image_url || null,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, id));

      console.log(`User updated in database: ${id} (${primaryEmail})`);
    }

    // Handle user.deleted event
    if (evt.type === "user.deleted") {
      const { id } = evt.data;

      // Delete user from database
      await db.delete(users).where(eq(users.clerkId, id!));

      console.log(`User deleted from database: ${id}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return NextResponse.json({ error: "Error verifying webhook" }, { status: 400 });
  }
}
