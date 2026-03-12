export const GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
export type Genre = (typeof GENRES)[number];

export const ROLES = ["artist", "fan", "super_admin", "writer"] as const;
export type Role = (typeof ROLES)[number];

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface MediaImage {
  altText: string;
  height: number;
  url: string;
  width: number;
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
  availableForSale: boolean;
  id: string;
  images?: MediaImage[];
  price: Money;
  selectedOptions: SelectedOption[];
  title: string;
}

export interface Product {
  availableForSale: boolean;
  description: string;
  descriptionHtml?: string;
  featuredImage: MediaImage;
  handle: string;
  id: string;
  images: MediaImage[];
  options: ProductOption[];
  priceRange: {
    maxVariantPrice: Money;
    minVariantPrice: Money;
  };
  tags?: string[];
  title: string;
  variants: ProductVariant[];
}

export interface ProductSummary {
  availableForSale: boolean;
  featuredImage: MediaImage;
  handle: string;
  id: string;
  priceRange: Product["priceRange"];
  title: string;
}

export interface ArtistReference {
  id: number;
  image?: string | null;
  name: string;
  slug: string;
}

export interface AuthorReference {
  id: string;
  name: string;
}

export type ArticleContentKind =
  | "tiptap_json"
  | "nested_tiptap_json"
  | "stringified_tiptap_json"
  | "html_or_text";

export interface ArticleContentMark {
  attrs?: Record<string, unknown>;
  type: string;
}

export interface ArticleContentNode {
  attrs?: Record<string, unknown>;
  content?: ArticleContentNode[];
  marks?: ArticleContentMark[];
  text?: string;
  type: string;
}

export interface ArticleSummary {
  artists: ArtistReference[];
  author: AuthorReference;
  category: Genre;
  comment_count?: number;
  cover_image: string | null;
  created_at: string;
  excerpt: string;
  id: number;
  is_cover_story?: boolean;
  published_at: string | null;
  slug: string;
  title: string;
  views: number;
}

export interface ArticleDetail extends ArticleSummary {
  content: string;
  content_doc?: ArticleContentNode | null;
  content_html?: string | null;
  content_kind?: ArticleContentKind;
  updated_at: string;
}

export interface EventSummary {
  artists: ArtistReference[];
  created_at: string;
  date: string;
  description: string;
  genre: Genre;
  id: number;
  image: string | null;
  location: string;
  price: string | null;
  slug: string;
  ticket_link: string | null;
  time: string | null;
  title: string;
  venue: string;
}

export interface EventDetail extends EventSummary {
  updated_at: string;
}

export interface ArtistDetail {
  article_count: number;
  bio: string;
  claimed: boolean;
  created_at: string;
  event_count: number;
  genre: Genre;
  id: number;
  image: string | null;
  instagram: string | null;
  location: string;
  name: string;
  phone_number?: string | null;
  profile_views: number;
  slug: string;
  spotify_artist_id: string | null;
  spotify_url: string | null;
  tiktok: string | null;
  twitter: string | null;
  website: string | null;
}

export interface WriterSummary {
  articleCount: number;
  bio: string | null;
  id: number;
  image: string | null;
  name: string;
  role: Role;
}

export interface ArticleComment {
  content: string;
  created_at: string;
  id: number;
  replies?: ArticleComment[];
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface UserComment {
  article: {
    cover_image: string | null;
    id: number;
    slug: string;
    title: string;
  };
  content: string;
  created_at: string;
  id: number;
  parent: number | null;
  replies: Pick<UserComment, "content" | "created_at" | "id" | "updated_at">[];
  updated_at: string;
}

export interface DashboardStats {
  articles_read_count: number;
  articles_saved_count: number;
  comments_count: number;
}

export interface MonthlyHomepageStats {
  featuredArtistsCount: number;
  liveEventsCount: number;
  monthEnd: string;
  monthStart: string;
  newArticlesCount: number;
}

export interface UserSession {
  avatar: string | null;
  email: string;
  id: string;
  name: string;
  onboardingComplete?: boolean;
  role: Role;
}

export interface OnboardingProfile {
  artist: {
    bio: string;
    genre: Genre;
    id: number;
    image: string;
    instagram: string;
    location: string;
    name: string;
    phoneNumber: string;
    spotifyArtistId: string;
    spotifyUrl: string;
    tiktok: string;
    twitter: string;
    website: string;
  } | null;
  fan: {
    name: string;
  };
  onboardingComplete: boolean;
  role: Role;
}

export interface CartItem {
  cost: {
    totalAmount: Money;
  };
  id: string;
  merchandise: {
    id: string;
    product: {
      featuredImage: MediaImage;
      handle: string;
      id: string;
      title: string;
    };
    selectedOptions: SelectedOption[];
    title: string;
  };
  quantity: number;
}

export interface Cart {
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
  };
  currency: string;
  id: string | undefined;
  lines: CartItem[];
  totalQuantity: number;
}

export interface CartResponse {
  cart: Cart | null;
  checkout_url: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
