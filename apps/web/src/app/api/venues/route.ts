import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET() {
  try {
    const allVenues = await db
      .select({
        address: venues.address,
        capacity: venues.capacity,
        city: venues.city,
        createdAt: venues.createdAt,
        description: venues.description,
        genres: venues.genres,
        id: venues.id,
        image: venues.image,
        name: venues.name,
        phone: venues.phone,
        slug: venues.slug,
        state: venues.state,
        website: venues.website,
        zip: venues.zip,
      })
      .from(venues)
      .orderBy(asc(venues.name));

    return NextResponse.json(allVenues);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "get_venues_api" },
      "Failed to fetch venues",
    );
    return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 });
  }
}
