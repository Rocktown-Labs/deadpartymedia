import { useLocation, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { createContext, startTransition, useContext, useMemo, useOptimistic } from "react";

export type ProductState = Record<string, string> & {
  image?: string;
};

interface ProductContextType {
  state: ProductState;
  updateOption: (name: string, value: string) => ProductState;
  updateImage: (index: string) => ProductState;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: ProductState;
}) {
  const searchParams = useLocation({
    select: (location) => new URLSearchParams(location.searchStr),
  });

  const getInitialState = () => {
    const params: ProductState = { ...initialState };
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  };

  const [state, setOptimisticState] = useOptimistic(
    getInitialState(),
    (prevState: ProductState, update: ProductState) => ({
      ...prevState,
      ...update,
    }),
  );

  const updateOption = (name: string, value: string) => {
    const newState = { [name]: value };
    startTransition(() => {
      setOptimisticState(newState);
    });
    return { ...state, ...newState };
  };

  const updateImage = (index: string) => {
    const newState = { image: index };
    startTransition(() => {
      setOptimisticState(newState);
    });
    return { ...state, ...newState };
  };

  const value = useMemo(
    () => ({
      state,
      updateImage,
      updateOption,
    }),
    [state],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProduct must be used within a ProductProvider");
  }
  return context;
}

export function useUpdateURL() {
  const navigate = useNavigate({ from: "/merch/$handle" });

  return (state: ProductState) => {
    const newParams = new URLSearchParams(window.location.search);
    Object.entries(state).forEach(([key, value]) => {
      newParams.set(key, value);
    });
    navigate({ to: ".", search: () => Object.fromEntries(newParams), resetScroll: false });
  };
}
