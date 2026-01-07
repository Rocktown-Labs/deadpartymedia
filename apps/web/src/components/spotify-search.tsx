"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Search, Loader2 } from "lucide-react";
import { useSearchSpotifyArtists, type SpotifyArtist } from "@/lib/api/artists";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface SpotifySearchProps {
  value?: string;
  onSelect: (artist: SpotifyArtist) => void;
  className?: string;
}

/**
 * Extracts Spotify Artist ID from a full Spotify URL or returns the ID if already provided.
 */
function extractSpotifyId(input: string): string | null {
  if (!input) return null;

  // If it's already just an ID (alphanumeric, no slashes or dots)
  if (/^[a-zA-Z0-9]+$/.test(input.trim())) {
    return input.trim();
  }

  // Try to extract from URL patterns:
  // https://open.spotify.com/artist/4iHNK0tOyZPYnBU7iGc4UU
  // spotify:artist:4iHNK0tOyZPYnBU7iGc4UU
  const urlMatch = input.match(/artist\/([a-zA-Z0-9]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  return null;
}

export function SpotifySearch({ value, onSelect, className }: SpotifySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const { data: artists, isLoading, error } = useSearchSpotifyArtists(debouncedQuery);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle pasted URLs
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const extractedId = extractSpotifyId(pastedText);

    if (extractedId) {
      // If we extracted an ID from a URL, create a minimal artist object
      // The user will need to search to get full details, but we can set the ID
      const urlArtist: SpotifyArtist = {
        id: extractedId,
        name: pastedText, // Temporary, will be replaced when they search
        images: [],
        external_urls: { spotify: `https://open.spotify.com/artist/${extractedId}` },
        genres: [],
      };
      setSelectedArtist(urlArtist);
      setSearchQuery("");
      setIsOpen(false);
      onSelect(urlArtist);
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    setIsOpen(true);
    setSelectedArtist(null);
  };

  // Handle artist selection
  const handleSelectArtist = (artist: SpotifyArtist) => {
    setSelectedArtist(artist);
    setSearchQuery(artist.name);
    setIsOpen(false);
    onSelect(artist);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Show selected artist name if value is provided
  useEffect(() => {
    if (value && !searchQuery && !selectedArtist) {
      setSearchQuery(value);
    }
  }, [value, searchQuery, selectedArtist]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
        Spotify Artist
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onPaste={handlePaste}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
          placeholder="Search for your artist on Spotify..."
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchQuery.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-[#111111] border border-gray-800 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {error ? (
            <div className="p-4 text-sm text-red-400">
              Failed to search Spotify. Please try again.
            </div>
          ) : artists && artists.length > 0 ? (
            <div className="py-2">
              {artists.map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => handleSelectArtist(artist)}
                  className="w-full px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors flex items-center gap-3"
                >
                  {/* Artist Image */}
                  {artist.images && artist.images.length > 0 ? (
                    <img
                      src={artist.images[0].url}
                      alt={artist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                      <Music className="w-6 h-6 text-gray-500" />
                    </div>
                  )}

                  {/* Artist Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{artist.name}</div>
                    {artist.genres && artist.genres.length > 0 && (
                      <div className="text-xs text-gray-400 truncate">
                        {artist.genres.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.length >= 2 && !isLoading ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              No artists found. Try a different search term.
            </div>
          ) : null}
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Search for your artist or paste a Spotify artist URL
      </p>
    </div>
  );
}
