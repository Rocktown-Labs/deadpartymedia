import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";
export async function addItem(_state: unknown, merchandiseId?: string) {
  if (!merchandiseId) return "Select a variant";
  try {
    await readResponse(
      await musicApi.commerce.cart.items.$post({
        json: { merchandiseId, quantity: 1, operation: "add" },
      }),
    );
  } catch {
    return "Error adding item to cart";
  }
}
export async function removeItem(_state: unknown, merchandiseId: string) {
  try {
    await readResponse(
      await musicApi.commerce.cart.items.$post({
        json: { merchandiseId, quantity: 0, operation: "delete" },
      }),
    );
  } catch {
    return "Error removing item from cart";
  }
}
export async function updateItemQuantity(
  _state: unknown,
  data: { merchandiseId: string; quantity: number },
) {
  try {
    await readResponse(
      await musicApi.commerce.cart.items.$post({ json: { ...data, operation: "update" } }),
    );
  } catch {
    return "Error updating item quantity";
  }
}
export async function redirectToCheckout(_currency: string) {
  const { url } = await readResponse(await musicApi.commerce.checkout.$get());
  window.location.assign(url);
}
