import { db } from "../src/lib/db";
import { venues } from "../src/lib/db/schema";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Seeding initial Arkansas venues...");

  const initialVenues = [
    {
      name: "Vino's Pizza-Pub-Brewery",
      slug: "vinos",
      address: "923 W 7th St",
      city: "Little Rock",
      state: "AR",
      zip: "72201",
      phone: "501-375-8466",
      website: "https://vinosbrewpub.com",
      capacity: "250",
      description:
        "Historic brewpub and legendary underground punk, hardcore, metal, and indie music haven in downtown Little Rock since 1993.",
      bookingRates: "Door split / contact booking",
      bookingEmail: "booking@vinosbrewpub.com",
    },
    {
      name: "Full Moon Records",
      slug: "full-moon-records",
      address: "1104 Front St",
      city: "Conway",
      state: "AR",
      zip: "72032",
      phone: "501-287-7452",
      website: "https://thefullmoonrecords.com",
      capacity: "80",
      description:
        "Independent record shop, community hub, and intimate DIY performance space for local and touring acts in Conway, Arkansas.",
      bookingRates: "DIY space / donations & door",
      bookingEmail: "info@thefullmoonrecords.com",
    },
  ];

  for (const venue of initialVenues) {
    await db
      .insert(venues)
      .values(venue)
      .onConflictDoUpdate({
        target: venues.slug,
        set: {
          address: venue.address,
          city: venue.city,
          state: venue.state,
          zip: venue.zip,
          phone: venue.phone,
          website: venue.website,
          capacity: venue.capacity,
          description: venue.description,
          bookingRates: venue.bookingRates,
          bookingEmail: venue.bookingEmail,
          updatedAt: sql`NOW()`,
        },
      });
    console.log(`Seeded venue: ${venue.name}`);
  }

  console.log("Initial venues seeded successfully!");
}

main().catch((err) => {
  console.error("Failed to seed venues:", err);
  process.exit(1);
});
