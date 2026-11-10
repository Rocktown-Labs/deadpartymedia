import { musicApi } from "@/lib/music-client";
import type { InferResponseType } from "@dpmedia/api-client";
import { readResponse } from "@dpmedia/api-client";
export type BackfillAnalysis = InferResponseType<
  typeof musicApi.actions.admin.posts.wordpress.analyzeWordPressPostAction.$post,
  200
>;
export async function analyzeWordPressPostAction(title: string, contentHtml: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["wordpress"]["analyzeWordPressPostAction"].$post({
      json: { title: title, contentHtml: contentHtml },
    }),
  );

  return result;
}
interface ImportWordPressPostPayload {
  title: string;
  excerpt: string;
  category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  contentHtml: string;
  coverImageUrl: string | null;
  authorId: string;
  authorName?: string;
  isCoverStory: boolean;
  sourceUrl: string;
  sourceAuthorSlug: string;
  sourcePublishedAt: string;
  sourceModifiedAt: string | null;
  rawCategories: string[];
  selectedArtistIds: number[];
  newArtistsToCreate: {
    name: string;
    genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
    location: string;
    bio: string;
    spotifyUrl?: string | null;
    spotifyArtistId?: string | null;
    image?: string | null;
  }[];
  status?: "draft" | "published";
  tags?: string[];
}
export async function importWordPressPostAction(payload: ImportWordPressPostPayload) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["wordpress"]["importWordPressPostAction"].$post({
      json: { payload: payload },
    }),
  );

  return result;
}
export async function syncExistingArtistsSpotifyAction() {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["wordpress"]["syncExistingArtistsSpotifyAction"].$post(
      { json: {} },
    ),
  );

  return result;
}
export async function syncPublishedWordPressTagsAction() {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["wordpress"]["syncPublishedWordPressTagsAction"].$post(
      { json: {} },
    ),
  );

  return result;
}
