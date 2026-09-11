import { put } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { validateImageFile, generateImagePathname } from "@/lib/upload";
import type { UploadType } from "@/lib/upload";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";
import { checkRole } from "@/lib/auth/roles";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user. Fans have no upload need; restrict to staff and
    // onboarded creators to bound public-blob abuse / cost exhaustion.

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [isSuperAdmin, isWriter, isArtist, isVenue] = await Promise.all([
      checkRole("super_admin"),
      checkRole("writer"),
      checkRole("artist"),
      checkRole("venue"),
    ]);
    if (!(isSuperAdmin || isWriter || isArtist || isVenue)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get upload type from query params

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "content") as UploadType;

    // Validate upload type

    if (!["cover", "content", "profile", "event", "venue", "release"].includes(type)) {
      return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
    }

    // Get file from request body

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate pathname

    const pathname = generateImagePathname(
      type,
      file.name,
      // Add random suffix for content/profile/event images
      type === "content" || type === "profile" || type === "event",
    );

    // Upload to Vercel Blob

    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: type === "content" || type === "profile" || type === "event",
    });

    logger.info(
      {
        operation: "image_upload",
        pathname: blob.pathname,
        size: file.size,
        type,
        userId,
      },
      "Image uploaded successfully",
    );

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
    });
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "image_upload" },
      "Error uploading image",
    );

    // Handle specific Vercel Blob errors

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({ error: "File with this name already exists" }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 },
    );
  }
}
