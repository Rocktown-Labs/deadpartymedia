"use client";

import type { Cart, CartItem, Product, ProductVariant } from "@/lib/types";
import type React from "react";
import { createContext, use, useContext, useEffect, useMemo, useOptimistic, useState } from "react";

type UpdateType = "plus" | "minus" | "delete";

type CartAction =
  | { type: "UPDATE_ITEM"; payload: { merchandiseId: string; updateType: UpdateType } }
  | { type: "ADD_ITEM"; payload: { variant: ProductVariant; product: Product } };

interface CartContextType {
  cart: Cart | undefined;
  updateCartItem: (merchandiseId: string, updateType: UpdateType) => void;
  addCartItem: (variant: ProductVariant, product: Product) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function calculateItemCost(quantity: number, price: string): string {
  return (Number(price) * quantity).toString();
}

function updateCartItem(item: CartItem, updateType: UpdateType): CartItem | null {
  if (updateType === "delete") {
    return null;
  }

  const newQuantity = updateType === "plus" ? item.quantity + 1 : item.quantity - 1;
  if (newQuantity === 0) {
    return null;
  }

  const singleItemAmount = Number(item.cost.totalAmount.amount) / item.quantity;
  const newTotalAmount = calculateItemCost(newQuantity, singleItemAmount.toString());

  return {
    ...item,
    cost: {
      ...item.cost,
      totalAmount: {
        ...item.cost.totalAmount,
        amount: newTotalAmount,
      },
    },
    quantity: newQuantity,
  };
}

function createOrUpdateCartItem(
  existingItem: CartItem | undefined,
  variant: ProductVariant,
  product: Product,
): CartItem {
  const quantity = existingItem ? existingItem.quantity + 1 : 1;
  const totalAmount = calculateItemCost(quantity, variant.price.amount);

  return {
    cost: {
      totalAmount: {
        amount: totalAmount,
        currencyCode: variant.price.currencyCode,
      },
    },
    id: existingItem?.id || `${variant.id}-temp`,
    merchandise: {
      id: variant.id,
      product: {
        featuredImage: product.featuredImage,
        handle: product.handle,
        id: product.id,
        title: product.title,
      },
      selectedOptions: variant.selectedOptions,
      title: variant.title,
    },
    quantity,
  };
}

function updateCartTotals(lines: CartItem[]): Pick<Cart, "totalQuantity" | "cost"> {
  const totalQuantity = lines.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = lines.reduce((sum, item) => sum + Number(item.cost.totalAmount.amount), 0);
  const currencyCode = lines[0]?.cost.totalAmount.currencyCode ?? "USD";

  return {
    cost: {
      subtotalAmount: { amount: totalAmount.toString(), currencyCode },
      totalAmount: { amount: totalAmount.toString(), currencyCode },
    },
    totalQuantity,
  };
}

function createEmptyCart(): Cart {
  return {
    cost: {
      subtotalAmount: { amount: "0", currencyCode: "USD" },
      totalAmount: { amount: "0", currencyCode: "USD" },
    },
    currency: "USD",
    id: undefined,
    lines: [],
    totalQuantity: 0,
  };
}

function cartReducer(state: Cart | undefined, action: CartAction): Cart {
  const currentCart = state || createEmptyCart();

  switch (action.type) {
    case "UPDATE_ITEM": {
      const { merchandiseId, updateType } = action.payload;
      const updatedLines = currentCart.lines
        .map((item) =>
          item.merchandise.id === merchandiseId ? updateCartItem(item, updateType) : item,
        )
        .filter(Boolean) as CartItem[];

      if (updatedLines.length === 0) {
        return {
          ...currentCart,
          cost: {
            ...currentCart.cost,
            totalAmount: { ...currentCart.cost.totalAmount, amount: "0" },
          },
          lines: [],
          totalQuantity: 0,
        };
      }

      return { ...currentCart, ...updateCartTotals(updatedLines), lines: updatedLines };
    }
    case "ADD_ITEM": {
      const { variant, product } = action.payload;
      const existingItem = currentCart.lines.find((item) => item.merchandise.id === variant.id);
      const updatedItem = createOrUpdateCartItem(existingItem, variant, product);

      const updatedLines = existingItem
        ? currentCart.lines.map((item) => (item.merchandise.id === variant.id ? updatedItem : item))
        : [...currentCart.lines, updatedItem];

      return { ...currentCart, ...updateCartTotals(updatedLines), lines: updatedLines };
    }
    default: {
      return currentCart;
    }
  }
}

export function CartProvider({
  children,
  cartPromise,
}: {
  children: React.ReactNode;
  cartPromise?: Promise<Cart | undefined>;
}) {
  const initialCart = cartPromise ? use(cartPromise) : undefined;
  const [baseCart, setBaseCart] = useState(initialCart);
  const [optimisticCart, updateOptimisticCart] = useOptimistic(baseCart, cartReducer);

  useEffect(() => {
    if (cartPromise) {
      return;
    }

    const controller = new AbortController();

    async function hydrateCart() {
      const response = await fetch("/api/cart", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        return;
      }

      const cart = (await response.json()) as Cart | null;
      if (cart) {
        setBaseCart(cart);
      }
    }

    hydrateCart().catch(() => {
      // Cart hydration is best-effort; actions still fetch the authoritative cart.
    });

    return () => {
      controller.abort();
    };
  }, [cartPromise]);

  const updateCartItem = (merchandiseId: string, updateType: UpdateType) => {
    updateOptimisticCart({ payload: { merchandiseId, updateType }, type: "UPDATE_ITEM" });
  };

  const addCartItem = (variant: ProductVariant, product: Product) => {
    updateOptimisticCart({ payload: { product, variant }, type: "ADD_ITEM" });
  };

  const value = useMemo(
    () => ({
      addCartItem,
      cart: optimisticCart,
      updateCartItem,
    }),
    [optimisticCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
