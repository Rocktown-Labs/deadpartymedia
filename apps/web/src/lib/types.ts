export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  url: string;
  altText: string;
  width: number;
  height: number;
}

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  images?: Image[];
}

export interface Product {
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
}

export interface CartItem {
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
}

export interface Cart {
  id: string | undefined;
  totalQuantity: number;
  lines: CartItem[];
  currency: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
}
