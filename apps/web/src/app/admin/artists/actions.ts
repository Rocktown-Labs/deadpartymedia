import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createArtist(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["createArtist"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function updateArtist(id: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["updateArtist"].$post({
      json: { id: id, formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function inviteArtistToClaim(artistId: number, email: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["inviteArtistToClaim"].$post({
      json: { artistId: artistId, email: email },
    }),
  );

  return result ?? undefined;
}
export async function deleteArtist(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["deleteArtist"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
export async function setArtistHidden(id: number, hidden: boolean) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["setArtistHidden"].$post({
      json: { id: id, hidden: hidden },
    }),
  );

  return result ?? undefined;
}
export async function mergeArtistRecords(sourceArtistId: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["artists"]["mergeArtistRecords"].$post({
      json: { sourceArtistId: sourceArtistId, formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
