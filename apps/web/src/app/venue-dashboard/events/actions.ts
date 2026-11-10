import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createVenueEvent(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["venue-dashboard"]["events"]["createVenueEvent"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
