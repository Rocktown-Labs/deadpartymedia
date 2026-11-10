import { musicApi } from "@/lib/music-client";
import {
  artistOnboardingSchema,
  fanOnboardingSchema,
  venueOnboardingSchema,
} from "@/lib/validations/onboarding";
import { readResponse } from "@dpmedia/api-client";
import { normalizeInstagramInput } from "./validation";
type FormState = { success: boolean; errors: string[] };
export async function fanOnboardingAction(_state: FormState, form: FormData): Promise<FormState> {
  const data = fanOnboardingSchema.safeParse({
    ...Object.fromEntries(form),
    name: String(form.get("name") || ""),
  });
  if (!data.success) return { success: false, errors: data.error.issues.map((i) => i.message) };
  try {
    await readResponse(await musicApi.onboarding.fan.$post({ json: data.data }));
    return { success: true, errors: [] };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unable to save your profile"],
    };
  }
}
export async function artistOnboardingAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const fields = Object.fromEntries(form);
  fields.instagram = normalizeInstagramInput(fields.instagram);
  const data = artistOnboardingSchema.safeParse(fields);
  if (!data.success) return { success: false, errors: data.error.issues.map((i) => i.message) };
  try {
    await readResponse(await musicApi.onboarding.artist.$post({ json: data.data }));
    return { success: true, errors: [] };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unable to save your profile"],
    };
  }
}
export async function venueOnboardingAction(_state: FormState, form: FormData): Promise<FormState> {
  const data = venueOnboardingSchema.safeParse(Object.fromEntries(form));
  if (!data.success) return { success: false, errors: data.error.issues.map((i) => i.message) };
  try {
    await readResponse(await musicApi.onboarding.venue.$post({ json: data.data }));
    return { success: true, errors: [] };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unable to save your venue"],
    };
  }
}
