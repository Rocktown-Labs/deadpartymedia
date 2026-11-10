export interface Article {
  id: number;
  slug: string;
  title: string;
  category: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  excerpt: string;
  content: string;
  cover_image: string;
  author: {
    id: string;
    name: string;
    bio: string;
    image: string | null;
    role: string;
  };
  artists: {
    id: number;
    slug: string;
    name: string;
    image: string | null;
    bio?: string;
    location?: string;
    genre?: string;
    spotifyUrl?: string | null;
    spotifyArtistId?: string | null;
  }[];
  tags?: string[];
  status: "draft" | "published" | "archived";
  published_at: string | null;
  views: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleList {
  id: number;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover_image: string;
  author: {
    id: string;
    name: string;
  };
  artists: {
    id: number;
    slug: string;
    name: string;
  }[];
  tags?: string[];
  published_at: string | null;
  views: number;
  comment_count?: number;
  created_at: string;
}

export interface Comment {
  id: number;
  content: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}
