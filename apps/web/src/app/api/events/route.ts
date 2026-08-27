import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  listPublishedEvents,
  parseEventLimit,
  parseEventOffset,
  parseEventStatus,
} from "@/lib/api/events.server";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const status = parseEventStatus(searchParams.get("status"));
    const limit = parseEventLimit(searchParams.get("limit"));
    const offset = parseEventOffset(searchParams.get("offset"));
    const eventList = await listPublishedEvents({ genre, limit, offset, status });

    return NextResponse.json(
      {
        count: eventList.length,
        results: eventList,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    log.error({ error: sanitizeError(error), operation: "fetch_events" }, "Error fetching events");
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
