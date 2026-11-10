import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function addItem(_state: unknown, merchandiseId?: string) {
  if (!merchandiseId) throw new Error("Select a variant");
  return readResponse(
    await musicApi.commerce.cart.items.$post({
      json: { merchandiseId, quantity: 1, operation: "add" },
    }),
  );
}
export async function removeItem(_state: unknown, merchandiseId: string) {
  return readResponse(
    await musicApi.commerce.cart.items.$post({
      json: { merchandiseId, quantity: 0, operation: "delete" },
    }),
  );
}
export async function updateItemQuantity(
  _state: unknown,
  data: { merchandiseId: string; quantity: number },
) {
  return readResponse(
    await musicApi.commerce.cart.items.$post({ json: { ...data, operation: "update" } }),
  );
}
export async function getCurrentCart() {
  return readResponse(await musicApi.commerce.cart.$get());
}
export async function redirectToCheckout(_currency: string) {
  const { url } = await readResponse(await musicApi.commerce.checkout.$get());
  window.location.assign(url);
}
