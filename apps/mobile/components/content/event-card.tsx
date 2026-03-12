import type { EventSummary } from "@dpmedia/contracts";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { MapPinIcon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";
import { FadeInDown, LinearTransition } from "react-native-reanimated";

export function EventCard({
  compact = false,
  event,
  motionIndex = 0,
}: {
  compact?: boolean;
  event: EventSummary;
  motionIndex?: number;
}) {
  return (
    <NativeOnlyAnimatedView
      entering={FadeInDown.duration(260).delay(motionIndex * 45)}
      layout={LinearTransition.springify().damping(20)}
    >
      <Pressable
        className={compact ? "overflow-hidden rounded-[20px] border border-border bg-card" : "overflow-hidden rounded-[24px] border border-border bg-card"}
        onPress={() => router.push(`/events/${event.slug}`)}
      >
        {event.image ? (
          <Image
            className={compact ? "h-40 w-full bg-muted" : "h-72 w-full bg-muted"}
            resizeMode="cover"
            source={{ uri: event.image }}
          />
        ) : null}
        <View className={compact ? "gap-2 px-4 py-4" : "gap-3 px-5 py-5"}>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-xs uppercase tracking-[0.2em] text-primary">{event.genre}</Text>
            <Text className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {new Date(event.date).toLocaleDateString()}
            </Text>
          </View>
          <Text className={compact ? "text-xl font-black leading-7" : "text-3xl font-black"}>
            {event.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <MapPinIcon color="#98a2b3" size={16} />
            <Text className={compact ? "text-xs uppercase tracking-[0.08em] text-muted-foreground" : "text-sm uppercase tracking-[0.12em] text-muted-foreground"}>
              {event.venue}, {event.location}
            </Text>
          </View>
          <Text className={compact ? "text-sm leading-7 text-muted-foreground" : "text-base leading-8 text-muted-foreground"} numberOfLines={compact ? 2 : 3}>
            {event.description}
          </Text>
          {event.artists.length ? (
            <Text className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Featuring {event.artists.map((artist) => artist.name).join(", ")}
            </Text>
          ) : null}
          <Text className="pt-1 text-xs uppercase tracking-[0.18em] text-primary">View Event</Text>
        </View>
      </Pressable>
    </NativeOnlyAnimatedView>
  );
}
