import { ArtistCard } from "@/components/content/artist-card";
import { DataState } from "@/components/layout/data-state";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useArtists } from "@/lib/api/hooks";
import * as React from "react";
import { ScrollView, View } from "react-native";

export default function ArtistsTab() {
  const query = useArtists();
  const artists = query.data ?? [];
  const [filter, setFilter] = React.useState<"ALL" | "CLAIMED" | "COMPLETE">("ALL");
  const filteredArtists = artists.filter((artist) => {
    if (filter === "CLAIMED") {
      return artist.claimed;
    }

    if (filter === "COMPLETE") {
      return Boolean(artist.bio && artist.image && artist.location);
    }

    return true;
  });

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Community</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Artists
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          Discover Arkansas artists, their stories, and the events they are playing.
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        <View className="flex-row gap-3 pr-4">
          <Button
            variant={filter === "ALL" ? "default" : "outline"}
            className="h-12 rounded-none px-5"
            onPress={() => setFilter("ALL")}
          >
            <Text className="uppercase tracking-[0.18em]">All</Text>
          </Button>
          <Button
            variant={filter === "CLAIMED" ? "default" : "outline"}
            className="h-12 rounded-none px-5"
            onPress={() => setFilter("CLAIMED")}
          >
            <Text className="uppercase tracking-[0.18em]">Claimed</Text>
          </Button>
          <Button
            variant={filter === "COMPLETE" ? "default" : "outline"}
            className="h-12 rounded-none px-5"
            onPress={() => setFilter("COMPLETE")}
          >
            <Text className="uppercase tracking-[0.18em]">Complete Profiles</Text>
          </Button>
        </View>
      </ScrollView>
      <View className="gap-6">
        {query.error ? <DataState error={query.error} /> : null}
        {!query.error && filteredArtists.length === 0 ? (
          <DataState
            emptyMessage="No artists match the current filter."
            isLoading={query.isPending}
            loadingMessage="Loading artists..."
          />
        ) : null}
        {filteredArtists.map((artist, index) => (
          <ArtistCard key={artist.id} artist={artist} motionIndex={index} />
        ))}
      </View>
    </PublicScreen>
  );
}
