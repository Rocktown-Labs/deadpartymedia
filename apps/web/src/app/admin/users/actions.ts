import { encodeFormFields } from "@/lib/form-fields";
import { musicApi } from "@/lib/music-client";
import type { Roles } from "@/types/globals";
import { readResponse } from "@dpmedia/api-client";
export async function inviteUser(
  email: string,
  role: Roles,
  redirectUrl?: string,
  localUserProfileId?: number,
) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["inviteUser"].$post({
      json: {
        email: email,
        role: role,
        redirectUrl: redirectUrl,
        localUserProfileId: localUserProfileId,
      },
    }),
  );

  return result ?? undefined;
}
export async function createUserProfileStub(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["createUserProfileStub"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function createArtistProfileStub(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["createArtistProfileStub"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function createProfile(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["createProfile"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function updateLocalUserEmail(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["updateLocalUserEmail"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function updateArtistEmail(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["updateArtistEmail"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function inviteUserProfile(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["inviteUserProfile"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function inviteArtistProfile(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["inviteArtistProfile"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function deleteUser(userId: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["deleteUser"].$post({ json: { userId: userId } }),
  );

  return result ?? undefined;
}
export async function deleteLocalUserProfile(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["deleteLocalUserProfile"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
export async function revokeInvitation(invitationId: string) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["revokeInvitation"].$post({
      json: { invitationId: invitationId },
    }),
  );

  return result ?? undefined;
}
export async function resendInvitation(invitationId: string, email?: string, role?: Roles) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["resendInvitation"].$post({
      json: { invitationId: invitationId, email: email, role: role },
    }),
  );

  return result ?? undefined;
}
export async function updateUserRole(userId: string, role: Roles) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["updateUserRole"].$post({
      json: { userId: userId, role: role },
    }),
  );

  return result ?? undefined;
}
export async function updateLocalUserRole(formData: FormData) {
  const result = await readResponse(
    await musicApi.actions["admin"]["users"]["updateLocalUserRole"].$post({
      json: { formData: encodeFormFields(formData) },
    }),
  );

  return result ?? undefined;
}
