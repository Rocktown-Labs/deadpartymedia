import { describe, expect, it } from "vite-plus/test";
import type { ArtsArticleListItem, ArtsEventListItem } from "#/lib/content.functions.ts";

describe("Events and articles filtering and search logic", () => {
  describe("events filtering", () => {
    const sampleEvents: ArtsEventListItem[] = [
      {
        createdAt: new Date("2026-09-01"),
        date: "2026-10-18",
        description: "Annual block party and gallery preview in Little Rock",
        id: 1,
        image: null,
        location: "Little Rock, AR",
        price: "Free",
        slug: "block-party-2026",
        status: "published",
        ticketLink: null,
        time: "6:00 PM",
        title: "Main St Art Walk",
        venue: "SOMA Gallery",
      },
      {
        createdAt: new Date("2026-09-01"),
        date: "2026-08-10",
        description: "Past ceramic showcase",
        id: 2,
        image: null,
        location: "Fayetteville, AR",
        price: "$10",
        slug: "past-ceramic-showcase",
        status: "published",
        ticketLink: null,
        time: "7:00 PM",
        title: "Pottery Night",
        venue: "Community Clay",
      },
    ];

    it("filters events by keyword across title, venue, and location", () => {
      const searchEvents = (events: ArtsEventListItem[], query: string) => {
        const term = query.toLowerCase().trim();
        return events.filter(
          (e) =>
            e.title.toLowerCase().includes(term) ||
            e.venue.toLowerCase().includes(term) ||
            e.location.toLowerCase().includes(term) ||
            e.description.toLowerCase().includes(term),
        );
      };

      expect(searchEvents(sampleEvents, "soma")).toHaveLength(1);
      expect(searchEvents(sampleEvents, "Fayetteville")).toHaveLength(1);
      expect(searchEvents(sampleEvents, "clay")).toHaveLength(1);
      expect(searchEvents(sampleEvents, "nonexistent")).toHaveLength(0);
    });

    it("sorts events chronologically ascending and descending", () => {
      const sortEvents = (events: ArtsEventListItem[], direction: "date_asc" | "date_desc") => {
        return [...events].sort((a, b) => {
          const timeA = new Date(`${a.date}T00:00:00`).getTime();
          const timeB = new Date(`${b.date}T00:00:00`).getTime();
          return direction === "date_asc" ? timeA - timeB : timeB - timeA;
        });
      };

      const asc = sortEvents(sampleEvents, "date_asc");
      expect(asc[0].slug).toBe("past-ceramic-showcase");

      const desc = sortEvents(sampleEvents, "date_desc");
      expect(desc[0].slug).toBe("block-party-2026");
    });
  });

  describe("articles filtering", () => {
    const sampleArticles: ArtsArticleListItem[] = [
      {
        artmakerIds: [1],
        artmakers: [{ id: 1, name: "Isaac Bristow", slug: "isaac-bristow" }],
        authorId: "user_1",
        content: "Story body",
        coverImage: null,
        createdAt: new Date("2026-09-01"),
        excerpt: "An inside look at Black Cobra Tattoo studio and ink craft.",
        id: 1,
        publishedAt: new Date("2026-10-02T12:00:00Z"),
        slug: "isaac-bristow-interview",
        status: "published",
        tags: ["Interview", "Tattoo"],
        title: "Tattooing as Visual Tradition",
      },
      {
        artmakerIds: [],
        artmakers: [],
        authorId: "user_2",
        content: "Story body",
        coverImage: null,
        createdAt: new Date("2026-09-02"),
        excerpt: "Exploring the experimental ceramic movement in Hot Springs.",
        id: 2,
        publishedAt: new Date("2026-10-08T12:00:00Z"),
        slug: "hot-springs-ceramics",
        status: "published",
        tags: ["Studio Visit", "Ceramics"],
        title: "Earth & Kiln: Hot Springs Clay",
      },
    ];

    it("extracts unique categories from tags", () => {
      const categories = new Set<string>();
      for (const a of sampleArticles) {
        if (a.tags) {
          for (const t of a.tags) categories.add(t);
        }
      }
      expect(Array.from(categories)).toEqual(["Interview", "Tattoo", "Studio Visit", "Ceramics"]);
    });

    it("filters articles by category and search keywords", () => {
      const searchArticles = (
        articles: ArtsArticleListItem[],
        category?: string,
        query?: string,
      ) => {
        return articles.filter((a) => {
          if (
            category &&
            !a.tags?.some((t) => t.toLowerCase() === category.toLowerCase()) &&
            !a.title.toLowerCase().includes(category.toLowerCase())
          ) {
            return false;
          }
          if (query) {
            const term = query.toLowerCase();
            const matchesText =
              a.title.toLowerCase().includes(term) || a.excerpt.toLowerCase().includes(term);
            const matchesArtist = a.artmakers.some((m) => m.name.toLowerCase().includes(term));
            if (!matchesText && !matchesArtist) return false;
          }
          return true;
        });
      };

      expect(searchArticles(sampleArticles, "Interview")).toHaveLength(1);
      expect(searchArticles(sampleArticles, undefined, "Isaac Bristow")).toHaveLength(1);
      expect(searchArticles(sampleArticles, undefined, "Hot Springs")).toHaveLength(1);
      expect(searchArticles(sampleArticles, "Tattoo", "Ceramics")).toHaveLength(0);
    });

    it("restricts article modifications to owner unless caller holds admin role", () => {
      const canManageArticle = (
        caller: { userId: string; roles: string[]; role?: string },
        articleAuthorId: string,
      ) => {
        const isAdmin =
          caller.role === "super_admin" ||
          caller.role === "admin" ||
          caller.role === "arts_admin" ||
          caller.roles.some((r) => r === "super_admin" || r === "admin" || r === "arts_admin");
        return isAdmin || caller.userId === articleAuthorId;
      };

      const superAdmin = { userId: "admin_user", roles: ["super_admin"] };
      const artsAdmin = { userId: "arts_admin_user", roles: ["arts_admin"] };
      const authorWriter = { userId: "user_1", roles: ["arts_writer"] };
      const otherWriter = { userId: "user_other", roles: ["arts_writer"] };

      // Super admin and arts admin can manage any article
      expect(canManageArticle(superAdmin, "user_1")).toBe(true);
      expect(canManageArticle(superAdmin, "user_2")).toBe(true);
      expect(canManageArticle(artsAdmin, "user_1")).toBe(true);
      expect(canManageArticle(artsAdmin, "user_2")).toBe(true);

      // Writer can manage their own article
      expect(canManageArticle(authorWriter, "user_1")).toBe(true);

      // Writer cannot manage another author's article
      expect(canManageArticle(authorWriter, "user_2")).toBe(false);
      expect(canManageArticle(otherWriter, "user_1")).toBe(false);
    });
  });
});
