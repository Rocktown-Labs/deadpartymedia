"use client";

import { useState, useRef, useEffect } from "react";
import { Music, Search, Loader2 } from "lucide-react";
import {
  useSearchSpotifyArtists,
  useSpotifyArtistById,
  type SpotifyArtist,
} from "@/lib/api/artists";
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

/**
 * Checks if the input string is a Spotify URL
 */
function isSpotifyUrl(input: string): boolean {
  if (!input) return false;
  return (
    input.includes("spotify.com/artist/") ||
    input.includes("spotify:artist:") ||
    /^https?:\/\/.*spotify.*artist/.test(input)
  );
}

export function SpotifySearch({ value, onSelect, className }: SpotifySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<SpotifyArtist | null>(null);
  const [pastedArtistId, setPastedArtistId] = useState<string | null>(null);

  // Extract artist ID from value prop if it's a URL
  const valueArtistId = value ? extractSpotifyId(value) : null;

  // Only search if query is not a URL and has at least 5 characters
  const isQueryUrl = isSpotifyUrl(searchQuery);
  const debouncedQuery = useDebounce(searchQuery, 500);
  const shouldSearch = !isQueryUrl && debouncedQuery.length >= 5 && !pastedArtistId;

  // Only pass query to hook when we should search (prevents unnecessary hook calls)
  const searchQueryForHook = shouldSearch ? debouncedQuery : "";
  const {
    data: artists,
    isLoading: isSearchLoading,
    error: searchError,
  } = useSearchSpotifyArtists(searchQueryForHook);

  // Track if we've initialized from value prop to prevent re-fetching
  const [hasInitializedFromValue, setHasInitializedFromValue] = useState(false);

  // Fetch artist by ID when pasting URL or when value prop contains URL (only once)
  const artistIdToFetch =
    pastedArtistId ||
    (valueArtistId && !selectedArtist && !hasInitializedFromValue ? valueArtistId : null);
  const {
    data: fetchedArtist,
    isLoading: isFetchingArtist,
    error: fetchError,
  } = useSpotifyArtistById(artistIdToFetch);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle fetched artist from URL (paste or value prop)
  useEffect(() => {
    if (fetchedArtist) {
      // Only set if we don't already have this artist selected
      if (!selectedArtist || selectedArtist.id !== fetchedArtist.id) {
        setSelectedArtist(fetchedArtist);
        setSearchQuery(fetchedArtist.name);
        setIsOpen(false);
        setPastedArtistId(null);
        if (valueArtistId && !hasInitializedFromValue) {
          setHasInitializedFromValue(true);
        }
        onSelect(fetchedArtist);
      }
    }
  }, [fetchedArtist, selectedArtist, onSelect, valueArtistId, hasInitializedFromValue]);

  // Handle pasted URLs
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text");
    const extractedId = extractSpotifyId(pastedText);

    if (extractedId) {
      // Prevent default paste behavior
      e.preventDefault();
      // Clear search query and fetch artist details
      setSearchQuery("");
      setPastedArtistId(extractedId);
      setIsOpen(false);
      setSelectedArtist(null);
    }
    // If it's not a URL, let the normal paste/input change handle it
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Check if the new value is a URL
    const isUrl = isSpotifyUrl(newValue);
    const extractedId = isUrl ? extractSpotifyId(newValue) : null;

    if (extractedId) {
      // User typed/pasted a URL, fetch artist
      setSearchQuery("");
      setPastedArtistId(extractedId);
      setIsOpen(false);
      setSelectedArtist(null);
    } else {
      // Normal text input - search
      setSearchQuery(newValue);
      setPastedArtistId(null); // Clear any pending paste
      setHasInitializedFromValue(false); // Allow re-initialization if needed

      // Show dropdown if query is long enough or if user is typing
      if (newValue.length >= 5) {
        setIsOpen(true);
      } else if (newValue.length > 0) {
        setIsOpen(true); // Show even if less than 5 chars (will show helper text)
      }

      // Clear selected artist if user starts typing different text
      if (selectedArtist && newValue !== selectedArtist.name) {
        setSelectedArtist(null);
      }
    }
  };

  // Handle artist selection from dropdown
  const handleSelectArtist = (artist: SpotifyArtist) => {
    setSelectedArtist(artist);
    setSearchQuery(artist.name);
    setIsOpen(false);
    setPastedArtistId(null);
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

  // Initialize from value prop (only once on mount or when value changes)
  useEffect(() => {
    if (value && !hasInitializedFromValue && !selectedArtist) {
      const extractedId = extractSpotifyId(value);
      if (extractedId) {
        // Value is a URL, will be handled by useSpotifyArtistById
        setPastedArtistId(extractedId);
        setSearchQuery(""); // Clear search query when URL is detected
      } else if (!searchQuery && value.trim().length > 0) {
        // Value is artist name, set as search query
        setSearchQuery(value);
      }
      setHasInitializedFromValue(true);
    }
  }, [value, hasInitializedFromValue, searchQuery, selectedArtist]);

  const isLoading = isSearchLoading || isFetchingArtist;
  const error = searchError || fetchError;

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
          onFocus={() => {
            // Open dropdown when focused (user can see helper text or results)
            if (searchQuery.length > 0 || isFetchingArtist || pastedArtistId) {
              setIsOpen(true);
            }
          }}
          className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
          placeholder="Search for your artist on Spotify..."
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && (shouldSearch || (searchQuery.length > 0 && searchQuery.length < 5)) && (
        <div className="absolute z-50 w-full mt-2 bg-[#111111] border border-gray-800 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {error ? (
            <div className="p-4 text-sm text-red-400">
              {fetchError
                ? `Failed to load artist: ${fetchError.message || "Unknown error"}. Please try searching instead.`
                : `Failed to search Spotify: ${searchError?.message || "Unknown error"}. Please try again.`}
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
          ) : shouldSearch && !isLoading ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              No artists found. Try a different search term.
            </div>
          ) : searchQuery.length > 0 && searchQuery.length < 5 ? (
            <div className="p-4 text-sm text-gray-400 text-center">
              Type at least {5 - searchQuery.length} more character
              {5 - searchQuery.length === 1 ? "" : "s"} to search
            </div>
          ) : null}
        </div>
      )}

      {/* Loading state for URL paste */}
      {isFetchingArtist && pastedArtistId && (
        <div className="absolute z-50 w-full mt-2 bg-[#111111] border border-gray-800 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading artist details...
          </div>
        </div>
      )}

      {/* Error state for URL paste */}
      {fetchError && pastedArtistId && !isFetchingArtist && (
        <div className="mt-2 p-3 bg-red-900/20 border border-red-800 rounded-lg">
          <p className="text-sm text-red-400">
            {fetchError.message === "Artist not found"
              ? "Artist not found. Please try searching by name instead."
              : "Failed to load artist. Please try searching by name instead."}
          </p>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {isQueryUrl
          ? "Paste detected. Loading artist..."
          : searchQuery.length > 0 && searchQuery.length < 5
            ? `Type at least ${5 - searchQuery.length} more character${5 - searchQuery.length === 1 ? "" : "s"} to search`
            : "Search for your artist or paste a Spotify artist URL"}
      </p>
    </div>
  );
}
