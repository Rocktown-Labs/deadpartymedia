import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createEvent(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["createEvent"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function updateEvent(id: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["updateEvent"].$post({
      json: { id: id, formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function deleteEvent(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["events"]["deleteEvent"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
