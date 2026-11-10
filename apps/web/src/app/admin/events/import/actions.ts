import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import type { InferResponseType } from "@dpmedia/api-client";
import { readResponse } from "@dpmedia/api-client";
export type EventFlyerAnalysis = InferResponseType<
  typeof musicApi.actions.admin.events.import.analyzeEventFlyerAction.$post,
  200
>;
export async function analyzeEventFlyerAction(imageUrl: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["import"]["analyzeEventFlyerAction"].$post({
      json: { imageUrl: imageUrl },
    }),
  );

  return result;
}
export async function createEventFromFlyerImportAction(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["import"]["createEventFromFlyerImportAction"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result;
}
export async function createEventImportArtistStubAction(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["import"]["createEventImportArtistStubAction"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result;
}
