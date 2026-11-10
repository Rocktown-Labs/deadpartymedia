import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createPost(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["createPost"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function updatePost(id: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["updatePost"].$post({
      json: { id: id, formData: encodeFormFields(formData) },
    }),
  );
  if (result && "redirectUrl" in result) window.location.assign(result.redirectUrl);
  return result ?? undefined;
}
export async function bulkUpdatePostStatus(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["bulkUpdatePostStatus"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function requestDeletePost(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["requestDeletePost"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
export async function approveDeletePost(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["approveDeletePost"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
export async function denyDeletePost(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["denyDeletePost"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
export async function deletePost(id: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["posts"]["deletePost"].$post({ json: { id: id } }),
  );

  return result ?? undefined;
}
