import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createVenue(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["venues"]["createVenue"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function updateVenue(venueId: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["venues"]["updateVenue"].$post({
      json: { venueId: venueId, formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function deleteVenue(venueId: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["venues"]["deleteVenue"].$post({ json: { venueId: venueId } }),
  );

  return result ?? undefined;
}
