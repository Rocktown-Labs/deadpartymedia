import { z } from "zod";
export const backfillRequestSchema = z.object({
  limit: z.number().int().min(1).max(100).default(40),
  offset: z.number().int().min(0).default(0),
  authorId: z.string().min(1),
  status: z.enum(["draft", "published"]).default("published"),
  source: z.enum(["wordpress", "local_drafts"]).default("wordpress"),
});
export type BackfillInput = z.infer<typeof backfillRequestSchema> & { runId: string };
export interface DedupeInput {
  runId: string;
}
