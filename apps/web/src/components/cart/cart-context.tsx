import type { Cart, CartItem, Product, ProductVariant } from "@/lib/types";
import type React from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { addItem, getCurrentCart, removeItem, updateItemQuantity } from "@/app/cart/actions";

type UpdateType = "plus" | "minus" | "delete";

type CartAction =
  | { type: "UPDATE_ITEM"; payload: { merchandiseId: string; updateType: UpdateType } }
  | { type: "ADD_ITEM"; payload: { variant: ProductVariant; product: Product } };

interface CartContextType {
  cart: Cart | undefined;
  error: string | null;
  updateCartItem: (merchandiseId: string, updateType: UpdateType) => Promise<boolean>;
  addCartItem: (variant: ProductVariant, product: Product) => Promise<boolean>;
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
  initialCart,
}: {
  children: React.ReactNode;
  initialCart: Cart | undefined;
}) {
  const [cart, setCart] = useState(initialCart);
  const [error, setError] = useState<string | null>(null);
  const cartRef = useRef(initialCart);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const enqueue = useCallback(
    (operation: () => Promise<Cart | undefined>) => {
      const operationRevision = ++revision.current;
      setError(null);
      let succeeded = true;
      const pending = queue.current.then(async () => {
        try {
          const result = await operation();
          if (operationRevision === revision.current && result) {
            cartRef.current = result;
            setCart(result);
          }
        } catch {
          succeeded = false;
          if (operationRevision === revision.current) {
            try {
              const current = (await getCurrentCart()) ?? createEmptyCart();
              cartRef.current = current;
              setCart(current);
            } catch {
              cartRef.current = initialCart;
              setCart(initialCart);
            }
            setError("We couldn't update your cart. Please try again.");
          }
        }
      });
      queue.current = pending;
      return pending.then(() => succeeded);
    },
    [initialCart],
  );

  const updateCartItem = useCallback(
    (merchandiseId: string, updateType: UpdateType) => {
      const current = cartRef.current;
      const item = current?.lines.find((line) => line.merchandise.id === merchandiseId);
      if (!item) return Promise.resolve(false);
      const nextQuantity =
        updateType === "plus" ? item.quantity + 1 : updateType === "minus" ? item.quantity - 1 : 0;
      const optimistic = cartReducer(current, {
        payload: { merchandiseId, updateType },
        type: "UPDATE_ITEM",
      });
      cartRef.current = optimistic;
      setCart(optimistic);
      return enqueue(() =>
        nextQuantity <= 0
          ? removeItem(null, merchandiseId)
          : updateItemQuantity(null, { merchandiseId, quantity: nextQuantity }),
      );
    },
    [enqueue],
  );

  const addCartItem = useCallback(
    (variant: ProductVariant, product: Product) => {
      const optimistic = cartReducer(cartRef.current, {
        payload: { product, variant },
        type: "ADD_ITEM",
      });
      cartRef.current = optimistic;
      setCart(optimistic);
      return enqueue(() => addItem(null, variant.id));
    },
    [enqueue],
  );

  const value = useMemo(
    () => ({
      addCartItem,
      cart,
      error,
      updateCartItem,
    }),
    [addCartItem, cart, error, updateCartItem],
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
