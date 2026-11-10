import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createImportedArtistAction(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["import"]["createImportedArtistAction"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
