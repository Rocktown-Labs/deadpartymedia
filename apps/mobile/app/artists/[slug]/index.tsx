import { ArticleCard } from "@/components/content/article-card";
import { EventCard } from "@/components/content/event-card";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useArtist, useArtistArticles, useArtistEvents } from "@/lib/api/hooks";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { GlobeIcon, InstagramIcon, MapPinIcon, Music2Icon } from "lucide-react-native";
import { Image, View } from "react-native";

function getSpotifyUrl(spotifyUrl: string | null, spotifyArtistId: string | null) {
  if (spotifyUrl) {
    return spotifyUrl;
  }

  if (spotifyArtistId) {
    return `https://open.spotify.com/artist/${spotifyArtistId}`;
  }

  return null;
}

export default function ArtistDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const artistQuery = useArtist(slug);
  const articlesQuery = useArtistArticles(slug);
  const eventsQuery = useArtistEvents(slug);
  const artist = artistQuery.data;

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      {artist ? (
        <>
          <Button
            variant="ghost"
            className="h-auto self-start px-0 py-0"
            onPress={() => router.push("/artists")}
          >
            <Text className="text-2xl text-primary">← Back to Artists</Text>
          </Button>

          {artist.image ? (
            <Image
              className="h-[420px] w-full rounded-[28px] bg-muted"
              resizeMode="cover"
              source={{ uri: artist.image }}
            />
          ) : null}

          <View className="gap-5">
            <Text variant="eyebrow">{artist.genre}</Text>
            <Text variant="display" className="text-6xl leading-[60px]">
              {artist.name}
            </Text>
            <View className="flex-row items-center gap-3">
              <MapPinIcon color="#7CFC00" size={18} />
              <Text className="text-xl text-muted-foreground">{artist.location}</Text>
            </View>
            <Text className="text-lg leading-9 text-foreground">{artist.bio}</Text>
          </View>

          <View className="gap-6 border border-border bg-card px-5 py-6">
            <Text variant="eyebrow">Profile</Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl text-muted-foreground">Articles</Text>
              <Text variant="display" className="text-4xl text-primary">
                {String(artist.article_count)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl text-muted-foreground">Events</Text>
              <Text variant="display" className="text-4xl text-secondary">
                {String(artist.event_count)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl text-muted-foreground">Profile Views</Text>
              <Text variant="display" className="text-4xl text-white">
                {String(artist.profile_views)}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-3">
            {artist.website ? (
              <Button
                variant="outline"
                className="rounded-none border-border bg-card px-4"
                onPress={() => Linking.openURL(artist.website ?? "")}
              >
                <GlobeIcon color="#7CFC00" size={18} />
                <Text>Website</Text>
              </Button>
            ) : null}
            {artist.instagram ? (
              <Button
                variant="outline"
                className="rounded-none border-border bg-card px-4"
                onPress={() => Linking.openURL(artist.instagram ?? "")}
              >
                <InstagramIcon color="#7CFC00" size={18} />
                <Text>Instagram</Text>
              </Button>
            ) : null}
            {getSpotifyUrl(artist.spotify_url, artist.spotify_artist_id) ? (
              <Button
                variant="outline"
                className="rounded-none border-border bg-card px-4"
                onPress={() =>
                  Linking.openURL(getSpotifyUrl(artist.spotify_url, artist.spotify_artist_id) ?? "")
                }
              >
                <Music2Icon color="#7CFC00" size={18} />
                <Text>Open Spotify</Text>
              </Button>
            ) : null}
          </View>

          {(articlesQuery.data ?? []).length ? (
            <View className="gap-6">
              <Text variant="h2" className="text-left">
                Stories
              </Text>
              {(articlesQuery.data ?? []).map((article, index) => (
                <ArticleCard key={article.id} article={article} motionIndex={index} variant="feature" />
              ))}
            </View>
          ) : null}

          {(eventsQuery.data ?? []).length ? (
            <View className="gap-6">
              <Text variant="h2" className="text-left">
                Events
              </Text>
              {(eventsQuery.data ?? []).map((event, index) => (
                <EventCard key={event.id} event={event} motionIndex={index} />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <Text className="text-lg text-muted-foreground">Loading artist...</Text>
      )}
    </PublicScreen>
  );
}
