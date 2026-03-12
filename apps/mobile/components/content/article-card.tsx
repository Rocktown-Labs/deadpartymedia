import type { ArticleSummary } from "@dpmedia/contracts";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { FadeInDown, LinearTransition } from "react-native-reanimated";

type ArticleCardVariant = "compact" | "feature" | "issue" | "rail";

export function ArticleCard({
  article,
  motionIndex = 0,
  variant = "feature",
}: {
  article: ArticleSummary;
  motionIndex?: number;
  variant?: ArticleCardVariant;
}) {
  const isIssue = variant === "issue";
  const isCompact = variant === "compact";
  const imageHeightClass = isCompact ? "h-40" : isIssue ? "h-60" : variant === "rail" ? "h-56" : "h-72";
  const titleClassName = isCompact
    ? "text-lg font-black leading-7"
    : variant === "issue"
      ? "text-2xl font-black"
      : variant === "rail"
        ? "text-[28px] font-black leading-9"
        : "text-3xl font-black";
  const wrapperClassName = isCompact
    ? "overflow-hidden rounded-[20px] border border-border bg-card"
    : "overflow-hidden rounded-[24px] border border-border bg-card";
  const bodyClassName = isCompact ? "gap-2 px-4 py-4" : "gap-3 px-5 py-5";

  return (
    <NativeOnlyAnimatedView
      entering={FadeInDown.duration(260).delay(motionIndex * 45)}
      layout={LinearTransition.springify().damping(20)}
    >
      <Pressable className={wrapperClassName} onPress={() => router.push(`/article/${article.slug}`)}>
        {article.cover_image ? (
          <View className={`overflow-hidden bg-muted ${imageHeightClass}`}>
            <View className="absolute left-3 top-3 z-10 rounded-none bg-black/85 px-3 py-2">
              <Text
                className={
                  isCompact
                    ? "text-[10px] uppercase tracking-[0.12em] text-primary"
                    : "text-xs uppercase tracking-[0.2em] text-primary"
                }
              >
                {article.category}
              </Text>
            </View>
            <Image className="h-full w-full" resizeMode="cover" source={{ uri: article.cover_image }} />
          </View>
        ) : null}
        <View className={isCompact ? `${bodyClassName} h-[196px] justify-between` : bodyClassName}>
          <Text className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {new Date(article.published_at ?? article.created_at).toLocaleDateString()}
          </Text>
          <Text className={titleClassName} numberOfLines={isCompact ? 3 : undefined}>
            {article.title}
          </Text>
          {!isIssue && !isCompact ? (
            <Text
              className={
                variant === "rail"
                  ? "text-sm leading-7 text-muted-foreground"
                  : "text-base leading-8 text-muted-foreground"
              }
              numberOfLines={3}
            >
              {article.excerpt}
            </Text>
          ) : null}
          <View
            className={
              isCompact
                ? "flex-row items-center justify-between gap-3 pt-1"
                : "flex-row items-center justify-between gap-4 pt-2"
            }
          >
            <Text
              className="flex-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
              numberOfLines={1}
            >
              By {article.author.name}
            </Text>
            {!isIssue && !isCompact ? (
              <Text className="text-[11px] uppercase tracking-[0.18em] text-primary">
                Read Story
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </NativeOnlyAnimatedView>
  );
}
