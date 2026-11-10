import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function createMusicRelease(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["createMusicRelease"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function updateMusicRelease(releaseId: number, formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["updateMusicRelease"].$post({
      json: { releaseId: releaseId, formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function deleteMusicRelease(releaseId: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["deleteMusicRelease"].$post({
      json: { releaseId: releaseId },
    }),
  );

  return result ?? undefined;
}
export async function bulkUpdateMusicReleaseStatus(
  releaseIds: number[],
  status: "draft" | "published" | "archived",
) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["bulkUpdateMusicReleaseStatus"].$post({
      json: { releaseIds: releaseIds, status: status },
    }),
  );

  return result ?? undefined;
}
export async function approveMusicSubmission(releaseId: number) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["approveMusicSubmission"].$post({
      json: { releaseId: releaseId },
    }),
  );

  return result ?? undefined;
}
export async function declineMusicSubmission(releaseId: number, declineReason?: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["music"]["declineMusicSubmission"].$post({
      json: { releaseId: releaseId, declineReason: declineReason },
    }),
  );

  return result ?? undefined;
}
