import { z } from "zod";
const errorSchema = z.object({
  error: z.string().optional(),
  details: z.array(z.unknown()).optional(),
});
export async function readApiError(response: Response) {
  const parsed = errorSchema.safeParse(await response.json().catch(() => null));
  return {
    error: parsed.success ? parsed.data.error || response.statusText : response.statusText,
    details: parsed.success ? parsed.data.details || [] : [],
  };
}
