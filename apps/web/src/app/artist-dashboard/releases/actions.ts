import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function submitArtistRelease(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["artist-dashboard"]["releases"]["submitArtistRelease"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
