export interface MusicReleaseData {
  id: number;
  slug: string;
  title: string;
  artistName: string;
  artistSlug?: string | null;
  artistId?: number | null;
  artistBio?: string | null;
  artistImage?: string | null;
  releaseType: "Album" | "Single" | "EP";
  genre: string;
  releaseDate: string | null;
  coverArt: string | null;
  excerpt: string;
  content: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  bandcampUrl: string | null;
  youtubeUrl: string | null;
  featured: boolean;
  views?: number;
  createdAt: string;
  author?: {
    id: string;
    name: string;
  };
}
