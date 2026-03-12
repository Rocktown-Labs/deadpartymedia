import type { Genre } from "@dpmedia/contracts";
import { ArticleCard } from "@/components/content/article-card";
import { DataState } from "@/components/layout/data-state";
import { EditorialSectionHeading } from "@/components/layout/editorial-section-heading";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useArticles } from "@/lib/api/hooks";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";

const GENRES: Genre[] = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"];

export default function MusicTab() {
  const params = useLocalSearchParams<{ genre?: Genre }>();
  const [genre, setGenre] = React.useState<Genre | "ALL">(params.genre ?? "ALL");
  const query = useArticles();
  const articles = query.data ?? [];
  const visibleGenres = genre === "ALL" ? GENRES : GENRES.filter((item) => item === genre);

  React.useEffect(() => {
    setGenre(params.genre ?? "ALL");
  }, [params.genre]);

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Latest Features</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Music
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          Explore the diverse sounds and stories of Arkansas music.
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        <View className="flex-row gap-3 pr-4">
          <Button
            variant={genre === "ALL" ? "default" : "outline"}
            className="h-12 rounded-none px-5"
            onPress={() => {
              setGenre("ALL");
              router.setParams({ genre: undefined });
            }}
          >
            <Text className="uppercase tracking-[0.18em]">All</Text>
          </Button>
          {GENRES.map((item) => (
            <Button
              key={item}
              variant={genre === item ? "default" : "outline"}
              className="h-12 rounded-none px-5"
              onPress={() => {
                setGenre(item);
                router.setParams({ genre: item });
              }}
            >
              <Text className="uppercase tracking-[0.18em]">{item}</Text>
            </Button>
          ))}
        </View>
      </ScrollView>
      {query.error ? <DataState error={query.error} /> : null}
      {!query.error && articles.length === 0 ? (
        <DataState
          emptyMessage="No stories were returned by the API."
          isLoading={query.isPending}
          loadingMessage="Loading stories..."
        />
      ) : null}
      <View className="gap-10">
        {visibleGenres.map((item) => {
          const grouped = articles.filter((article) => article.category === item);
          if (!grouped.length) {
            return null;
          }

          return (
            <View key={item} className="gap-6">
              <EditorialSectionHeading
                ctaLabel="View All"
                eyebrow="Genre"
                onPress={() => {
                  setGenre(item);
                  router.setParams({ genre: item });
                }}
                title={item}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 20, paddingRight: 16 }}
              >
                {grouped.map((article, index) => (
                  <View key={article.id} className="w-[320px]">
                    <ArticleCard article={article} motionIndex={index} variant="rail" />
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </View>
    </PublicScreen>
  );
}
