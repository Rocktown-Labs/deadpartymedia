import { ProductCard } from "@/components/content/product-card";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useEvent, useProducts } from "@/lib/api/hooks";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { CalendarIcon, Clock3Icon, MapPinIcon, TicketIcon } from "lucide-react-native";
import { Image, ScrollView, View } from "react-native";

export default function EventDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: event } = useEvent(slug);
  const merchQuery = useProducts(6);

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      {event ? (
        <>
          <Button
            variant="ghost"
            className="h-auto self-start px-0 py-0"
            onPress={() => router.push("/events")}
          >
            <Text className="text-2xl text-primary">← Back to Events</Text>
          </Button>

          {event.image ? (
            <Image
              className="h-[420px] w-full rounded-[28px] bg-muted"
              resizeMode="cover"
              source={{ uri: event.image }}
            />
          ) : null}

          <View className="gap-5">
            <View className="flex-row flex-wrap items-center gap-3">
              <View className="bg-primary px-4 py-3">
                <Text className="text-sm uppercase tracking-[0.18em] text-primary-foreground">
                  {event.genre}
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">
                {new Date(event.date).toLocaleDateString()}
              </Text>
            </View>

            <Text variant="display" className="text-6xl leading-[60px]">
              {event.title}
            </Text>

            <Text className="text-lg leading-8 text-muted-foreground">
              {event.venue}, {event.location}
            </Text>
          </View>

          <View className="gap-6 border border-border bg-card px-5 py-6">
            <Text variant="eyebrow">About This Event</Text>
            <Text className="text-lg leading-9 text-foreground">{event.description}</Text>
          </View>

          <View className="gap-5 border border-border bg-card px-5 py-6">
            <Text variant="eyebrow">Event Details</Text>
            <View className="gap-4">
              <View className="flex-row items-center gap-3">
                <CalendarIcon color="#7CFC00" size={18} />
                <Text className="text-xl text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
              {event.time ? (
                <View className="flex-row items-center gap-3">
                  <Clock3Icon color="#7CFC00" size={18} />
                  <Text className="text-xl text-muted-foreground">{event.time}</Text>
                </View>
              ) : null}
              <View className="flex-row items-center gap-3">
                <MapPinIcon color="#7CFC00" size={18} />
                <Text className="text-xl text-muted-foreground">
                  {event.venue}, {event.location}
                </Text>
              </View>
              {event.price ? (
                <View className="flex-row items-center gap-3">
                  <TicketIcon color="#7CFC00" size={18} />
                  <Text className="text-xl text-muted-foreground">{event.price}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {event.artists.length ? (
            <View className="gap-4">
              <Text variant="eyebrow">Featured Artists</Text>
              <View className="flex-row flex-wrap gap-3">
                {event.artists.map((artist) => (
                  <Button
                    key={artist.id}
                    variant="outline"
                    className="rounded-none border-border bg-card px-4"
                    onPress={() => router.push(`/artists/${artist.slug}`)}
                  >
                    <Text className="text-base">{artist.name}</Text>
                  </Button>
                ))}
              </View>
            </View>
          ) : null}

          {event.ticket_link ? (
            <Button className="h-16 rounded-none" onPress={() => Linking.openURL(event.ticket_link ?? "")}>
              <Text className="text-lg uppercase tracking-[0.18em] text-primary-foreground">
                Get Tickets
              </Text>
            </Button>
          ) : null}

          <View className="gap-7 border-t border-border pt-8">
            <Text variant="eyebrow">Official Store</Text>
            <View className="flex-row items-end justify-between gap-4">
              <Text variant="display" className="flex-1 text-6xl leading-[60px]">
                Merch
              </Text>
              <Button
                variant="ghost"
                className="h-auto px-0 py-0"
                onPress={() => router.push("/merch")}
              >
                <Text className="text-2xl text-primary">Shop All →</Text>
              </Button>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 20, paddingRight: 16 }}
            >
              {(merchQuery.data ?? []).slice(0, 6).map((product, index) => (
                <View key={product.id} className="w-[330px]">
                  <ProductCard className="w-full" compact motionIndex={index} product={product} />
                </View>
              ))}
            </ScrollView>
          </View>
        </>
      ) : (
        <Text className="text-lg text-muted-foreground">Loading event...</Text>
      )}
    </PublicScreen>
  );
}
