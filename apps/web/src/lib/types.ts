export type Money = {
  amount: string;
  currencyCode: string;
};

export type Image = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

export type ProductOption = {
  id: string;
  name: string;
  values: string[];
};

export type SelectedOption = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  images?: Image[];
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml?: string;
  featuredImage: Image;
  images: Image[];
  variants: ProductVariant[];
  options: ProductOption[];
  availableForSale: boolean;
  tags?: string[];
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
};

export type CartItem = {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
  };
  merchandise: {
    id: string;
    title: string;
    selectedOptions: SelectedOption[];
    product: {
      id: string;
      handle: string;
      title: string;
      featuredImage: Image;
    };
  };
};

export type Cart = {
  id: string | undefined;
  totalQuantity: number;
  lines: CartItem[];
  currency: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
};
