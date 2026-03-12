import type { ArtistDetail } from "@dpmedia/contracts";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { MapPinIcon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { FadeInDown, LinearTransition } from "react-native-reanimated";

export function ArtistCard({
  artist,
  motionIndex = 0,
}: {
  artist: ArtistDetail;
  motionIndex?: number;
}) {
  return (
    <NativeOnlyAnimatedView
      entering={FadeInDown.duration(260).delay(motionIndex * 45)}
      layout={LinearTransition.springify().damping(20)}
    >
      <Pressable
        className="overflow-hidden rounded-[24px] border border-border bg-card"
        onPress={() => router.push(`/artists/${artist.slug}`)}
      >
        {artist.image ? (
          <Image className="h-72 w-full bg-muted" resizeMode="cover" source={{ uri: artist.image }} />
        ) : null}
        <View className="gap-3 px-5 py-5">
          <Text className="text-xs uppercase tracking-[0.2em] text-primary">{artist.genre}</Text>
          <Text className="text-3xl font-black">{artist.name}</Text>
          <View className="flex-row items-center gap-2">
            <MapPinIcon color="#98a2b3" size={16} />
            <Text className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
              {artist.location}
            </Text>
          </View>
          <Text className="text-base leading-8 text-muted-foreground" numberOfLines={3}>
            {artist.bio}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {artist.article_count} articles
            </Text>
            <Text className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {artist.event_count} events
            </Text>
          </View>
        </View>
      </Pressable>
    </NativeOnlyAnimatedView>
  );
}
