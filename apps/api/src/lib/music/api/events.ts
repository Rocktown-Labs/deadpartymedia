export interface Event {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  ticket_link: string | null;
  price: string | null;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  status: "draft" | "published" | "past";
  artists: {
    id: number;
    slug: string;
    name: string;
    image: string | null;
  }[];
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface EventList {
  id: number;
  slug: string;
  title: string;
  description: string;
  image: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  ticket_link: string | null;
  price: string | null;
  genre: string;
  artists: {
    id: number;
    slug: string;
    name: string;
  }[];
  created_at: string;
}
