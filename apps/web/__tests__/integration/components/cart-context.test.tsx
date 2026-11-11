import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Cart, Product, ProductVariant } from "@/lib/types";

const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();

vi.mock("@/app/cart/actions", () => ({
  addItem: (...args: unknown[]) => mockAdd(...args),
  getCurrentCart: (...args: unknown[]) => mockGet(...args),
  removeItem: (...args: unknown[]) => mockRemove(...args),
  updateItemQuantity: (...args: unknown[]) => mockUpdate(...args),
}));

import { CartProvider, useCart } from "@/components/cart/cart-context";
import CartModal, { CartTrigger } from "@/components/cart/cart-modal";

const product: Product = {
  id: "product-1",
  handle: "shirt",
  title: "Dead Party Shirt",
  description: "",
  featuredImage: { url: "/shirt.jpg", altText: "", width: 100, height: 100 },
  images: [],
  variants: [],
  options: [],
  availableForSale: true,
  priceRange: {
    minVariantPrice: { amount: "20", currencyCode: "USD" },
    maxVariantPrice: { amount: "20", currencyCode: "USD" },
  },
};
const variant: ProductVariant = {
  id: "variant-1",
  title: "Default",
  availableForSale: true,
  selectedOptions: [],
  price: { amount: "20", currencyCode: "USD" },
};
const initialCart: Cart = {
  id: "cart-1",
  currency: "USD",
  totalQuantity: 2,
  lines: [
    {
      id: "line-1",
      quantity: 2,
      cost: { totalAmount: { amount: "40", currencyCode: "USD" } },
      merchandise: {
        id: variant.id,
        title: variant.title,
        selectedOptions: [],
        product: {
          id: product.id,
          handle: product.handle,
          title: product.title,
          featuredImage: product.featuredImage,
        },
      },
    },
  ],
  cost: {
    subtotalAmount: { amount: "40", currencyCode: "USD" },
    totalAmount: { amount: "40", currencyCode: "USD" },
  },
};

function Harness() {
  const { addCartItem, cart, updateCartItem } = useCart();
  return (
    <>
      <output data-testid="quantity">{cart?.lines[0]?.quantity ?? 0}</output>
      <button onClick={() => updateCartItem(variant.id, "minus")}>decrease</button>
      <button onClick={() => updateCartItem(variant.id, "plus")}>increase</button>
      <button onClick={() => updateCartItem(variant.id, "delete")}>delete</button>
      <button onClick={() => addCartItem(variant, product)}>add</button>
      <CartTrigger />
      <CartTrigger />
      <CartModal />
    </>
  );
}

describe("cart state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockImplementation((_state: unknown, input: { quantity: number }) => ({
      ...initialCart,
      lines: [
        {
          ...initialCart.lines[0],
          quantity: input.quantity,
          cost: { totalAmount: { amount: `${input.quantity * 20}`, currencyCode: "USD" } },
        },
      ],
      totalQuantity: input.quantity,
      cost: {
        subtotalAmount: { amount: `${input.quantity * 20}`, currencyCode: "USD" },
        totalAmount: { amount: `${input.quantity * 20}`, currencyCode: "USD" },
      },
    }));
    mockAdd.mockResolvedValue({
      ...initialCart,
      lines: [
        {
          ...initialCart.lines[0],
          quantity: 1,
          cost: { totalAmount: { amount: "20", currencyCode: "USD" } },
        },
      ],
      totalQuantity: 1,
      cost: {
        subtotalAmount: { amount: "20", currencyCode: "USD" },
        totalAmount: { amount: "20", currencyCode: "USD" },
      },
    });
    mockRemove.mockResolvedValue({
      ...initialCart,
      cost: {
        subtotalAmount: { amount: "0", currencyCode: "USD" },
        totalAmount: { amount: "0", currencyCode: "USD" },
      },
      lines: [],
      totalQuantity: 0,
    });
  });

  it("persists a decrement and displays it immediately", async () => {
    render(
      <CartProvider initialCart={initialCart}>
        <Harness />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "decrease" }));

    expect(screen.getByTestId("quantity")).toHaveTextContent("1");
    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(null, { merchandiseId: variant.id, quantity: 1 }),
    );
  });

  it("serializes rapid changes so the newest quantity reaches the API", async () => {
    render(
      <CartProvider initialCart={initialCart}>
        <Harness />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "increase" }));
    fireEvent.click(screen.getByRole("button", { name: "increase" }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenLastCalledWith(null, { merchandiseId: variant.id, quantity: 4 }),
    );
    expect(screen.getByTestId("quantity")).toHaveTextContent("4");
  });

  it("removes a line immediately and persists the deletion", async () => {
    render(
      <CartProvider initialCart={initialCart}>
        <Harness />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "delete" }));

    expect(screen.getByTestId("quantity")).toHaveTextContent("0");
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(null, variant.id));
  });

  it("opens the shared single drawer immediately when an item is added", async () => {
    render(
      <CartProvider initialCart={undefined}>
        <Harness />
      </CartProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "add" }));

    expect(screen.getByTestId("quantity")).toHaveTextContent("1");
    await waitFor(() => expect(screen.getByText("Dead Party Shirt")).toBeInTheDocument());
    expect(screen.getAllByRole("heading", { name: "Cart" })).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="sheet-content"]')).toHaveLength(1);
  });
});
