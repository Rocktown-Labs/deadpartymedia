import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  validateImageFile,
  generateImagePathname,
  type UploadType,
} from "@/lib/upload";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get upload type from query params
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") || "content") as UploadType;

    // Validate upload type
    if (!["cover", "content", "profile"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid upload type" },
        { status: 400 }
      );
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
      type === "content" || type === "profile" // Add random suffix for content/profile images
    );

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: type === "content" || type === "profile",
    });

    logger.info(
      {
        operation: "image_upload",
        userId,
        type,
        pathname: blob.pathname,
        size: file.size,
      },
      "Image uploaded successfully"
    );

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), operation: "image_upload" },
      "Error uploading image"
    );

    // Handle specific Vercel Blob errors
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "File with this name already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to upload image. Please try again." },
      { status: 500 }
    );
  }
}
