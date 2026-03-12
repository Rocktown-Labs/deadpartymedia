import { ArticleCard } from "@/components/content/article-card";
import { EventCard } from "@/components/content/event-card";
import { ProductCard } from "@/components/content/product-card";
import { DataState } from "@/components/layout/data-state";
import { EditorialSectionHeading } from "@/components/layout/editorial-section-heading";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  useArticles,
  useEvents,
  useMonthlyHomepageStats,
  useProducts,
} from "@/lib/api/hooks";
import { router } from "expo-router";
import { FlameIcon } from "lucide-react-native";
import { Image, ScrollView, View } from "react-native";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HomeTab() {
  const articlesQuery = useArticles();
  const eventsQuery = useEvents();
  const productsQuery = useProducts(8);
  const statsQuery = useMonthlyHomepageStats();

  const articles = articlesQuery.data ?? [];
  const coverStory = articles.find((article) => article.is_cover_story) ?? articles[0];
  const nonCoverStories = articles.filter((article) => article.id !== coverStory?.id);
  const issueStories = nonCoverStories.slice(0, 2);
  const latestStories = nonCoverStories.slice(2, 7);
  const upcomingEvents = (eventsQuery.data ?? []).slice(0, 3);
  const merch = (productsQuery.data ?? []).slice(0, 6);

  return (
    <PublicScreen contentClassName="gap-10 px-4 pb-10 pt-5">
      {articlesQuery.error ? <DataState error={articlesQuery.error} /> : null}

      {coverStory ? (
        <View className="overflow-hidden rounded-[28px] border border-border bg-card">
          <View className="relative min-h-[560px] bg-black">
            {coverStory.cover_image ? (
              <Image
                className="absolute inset-0 h-full w-full"
                resizeMode="cover"
                source={{ uri: coverStory.cover_image }}
              />
            ) : null}
            <View className="absolute inset-0 bg-black/45" />
            <View className="absolute inset-x-0 bottom-0 h-[58%] bg-black/90" />
            <View className="justify-end gap-5 px-5 pb-6 pt-12">
              <View className="self-start bg-primary px-4 py-3">
                <Text className="text-xs uppercase tracking-[0.28em] text-primary-foreground">
                  Cover Story
                </Text>
              </View>
              <Text variant="display" className="text-5xl leading-[54px] text-white">
                {coverStory.title}
              </Text>
              <View className="flex-row gap-4">
                <View className="w-1 bg-primary" />
                <Text className="flex-1 text-lg leading-9 text-white/80" numberOfLines={5}>
                  {coverStory.excerpt}
                </Text>
              </View>
              <View className="flex-row flex-wrap items-center gap-3">
                <Text variant="mono" className="text-[12px] uppercase tracking-[0.22em] text-white/70">
                  By {coverStory.author.name}
                </Text>
                <Text variant="mono" className="text-[12px] uppercase tracking-[0.22em] text-white/45">
                  •
                </Text>
                <Text variant="mono" className="text-[12px] uppercase tracking-[0.22em] text-white/70">
                  {formatDate(coverStory.published_at ?? coverStory.created_at)}
                </Text>
                <Text variant="mono" className="text-[12px] uppercase tracking-[0.22em] text-primary">
                  Featured
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <DataState
          emptyMessage="No cover story is available yet."
          isLoading={articlesQuery.isPending}
          loadingMessage="Loading the latest issue..."
        />
      )}

      <View className="border border-primary/30 bg-card px-5 py-6">
        <Text variant="eyebrow" className="text-muted-foreground">
          For Artists
        </Text>
        <Text variant="h2" className="mt-4 text-left">
          Get Featured in Our Next Issue
        </Text>
        <Text className="mt-5 text-lg leading-8 text-muted-foreground">
          Join our community of Arkansas artists. Create your profile and connect with our
          editorial team.
        </Text>
        <View className="mt-6 gap-3">
          <Button
            className="h-14 rounded-none"
            onPress={() => router.push("/(auth)/sign-up?role=artist")}
          >
            <Text className="text-base uppercase tracking-[0.18em] text-primary-foreground">
              Artist Registration
            </Text>
          </Button>
          <Button
            variant="outline"
            className="h-14 rounded-none border-border bg-transparent"
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text className="text-base uppercase tracking-[0.18em]">Sign In</Text>
          </Button>
        </View>
      </View>

      <View className="gap-6 border-t border-border pt-6">
        <View className="flex-row items-center gap-3">
          <FlameIcon color="#7CFC00" size={18} />
          <Text variant="eyebrow" className="text-muted-foreground">
            In This Issue
          </Text>
        </View>
        <View className="flex-row gap-4">
          {issueStories.map((article, index) => (
            <View key={article.id} className="flex-1">
              <ArticleCard article={article} motionIndex={index} variant="compact" />
            </View>
          ))}
        </View>
      </View>

      <View className="border border-border bg-card px-5 py-6">
        <Text variant="eyebrow" className="text-muted-foreground">
          This Month
        </Text>
        {statsQuery.data ? (
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1 items-center gap-3 rounded-[18px] border border-border px-3 py-4">
              <Text className="text-center text-xs uppercase tracking-[0.08em] text-muted-foreground">
                Featured Artists
              </Text>
              <Text variant="display" className="text-4xl text-primary">
                {String(statsQuery.data.featuredArtistsCount)}
              </Text>
            </View>
            <View className="flex-1 items-center gap-3 rounded-[18px] border border-border px-3 py-4">
              <Text className="text-center text-xs uppercase tracking-[0.08em] text-muted-foreground">
                Live Events
              </Text>
              <Text variant="display" className="text-4xl text-secondary">
                {String(statsQuery.data.liveEventsCount)}
              </Text>
            </View>
            <View className="flex-1 items-center gap-3 rounded-[18px] border border-border px-3 py-4">
              <Text className="text-center text-xs uppercase tracking-[0.08em] text-muted-foreground">
                New Articles
              </Text>
              <Text variant="display" className="text-4xl text-white">
                {String(statsQuery.data.newArticlesCount)}
              </Text>
            </View>
          </View>
        ) : (
          <DataState
            emptyMessage="Monthly stats are not available yet."
            isLoading={statsQuery.isPending}
            loadingMessage="Loading this month's numbers..."
          />
        )}
      </View>

      <View className="gap-7">
        <EditorialSectionHeading eyebrow="Latest Features" title="The Stories" />
        {latestStories.length ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 16, paddingRight: 8 }}
            >
              {latestStories.map((article, index) => (
                <View key={article.id} className="w-[285px]">
                  <ArticleCard article={article} motionIndex={index} variant="rail" />
                </View>
              ))}
            </ScrollView>
            <Button
              variant="outline"
              className="h-14 self-start rounded-none border-border px-6"
              onPress={() => router.push("/music")}
            >
              <Text className="text-base uppercase tracking-[0.18em] text-primary">
                View All Articles
              </Text>
            </Button>
          </>
        ) : (
          <DataState
            emptyMessage="No additional stories are available."
            isLoading={articlesQuery.isPending}
            loadingMessage="Loading more stories..."
          />
        )}
      </View>

      <View className="gap-7 border-t border-border pt-6">
        <EditorialSectionHeading
          eyebrow="What's On"
          onPress={() => router.push("/events")}
          ctaLabel="View Calendar"
          title="Live Events"
        />
        {upcomingEvents.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingRight: 8 }}
          >
            {upcomingEvents.map((event, index) => (
              <View key={event.id} className="w-[280px]">
                <EventCard compact event={event} motionIndex={index} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View className="min-h-52 items-center justify-center border-b border-border pb-8">
            <Text className="text-center text-2xl text-muted-foreground">
              No upcoming events right now.
            </Text>
          </View>
        )}
      </View>

      <View className="gap-7 border-t border-border pt-6">
        <EditorialSectionHeading
          eyebrow="Official Store"
          onPress={() => router.push("/merch")}
          ctaLabel="Shop All"
          title="Merch"
        />
        {merch.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingRight: 8 }}
          >
            {merch.map((product, index) => (
              <View key={product.id} className="w-[280px]">
                <ProductCard className="w-full" compact motionIndex={index} product={product} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <DataState
            emptyMessage="Merch is unavailable right now."
            isLoading={productsQuery.isPending}
            loadingMessage="Loading the official store..."
          />
        )}
      </View>
    </PublicScreen>
  );
}
