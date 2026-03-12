import * as SecureStore from "expo-secure-store";

const CART_STORAGE_KEY = "dpmedia.cart.id";

export async function clearStoredCartId() {
  await SecureStore.deleteItemAsync(CART_STORAGE_KEY);
}

export async function getStoredCartId() {
  return SecureStore.getItemAsync(CART_STORAGE_KEY);
}

export async function setStoredCartId(cartId: string | undefined) {
  if (!cartId) {
    await clearStoredCartId();
    return;
  }

  await SecureStore.setItemAsync(CART_STORAGE_KEY, cartId);
}
