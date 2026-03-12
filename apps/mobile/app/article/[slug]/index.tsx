import { ArticleContent } from "@/components/content/article-content";
import { ProductCard } from "@/components/content/product-card";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  useArticle,
  useArticleComments,
  useArticleContentDoc,
  useCreateComment,
  useMarkArticleRead,
  usePlainArticleContent,
  useProducts,
  useSaveArticle,
} from "@/lib/api/hooks";
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { BookmarkIcon, Share2Icon, UserIcon } from "lucide-react-native";
import * as React from "react";
import { Image, ScrollView, Share, View } from "react-native";

export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: article } = useArticle(slug);
  const { data: comments } = useArticleComments(slug);
  const merchQuery = useProducts(6);
  const markRead = useMarkArticleRead();
  const saveArticle = useSaveArticle();
  const createComment = useCreateComment();
  const plainContent = usePlainArticleContent(article);
  const contentDoc = useArticleContentDoc(article);
  const { isSignedIn } = useAuth();
  const [commentText, setCommentText] = React.useState("");

  React.useEffect(() => {
    if (article && isSignedIn) {
      markRead.mutate(article.id);
    }
  }, [article, isSignedIn, markRead]);

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      {article ? (
        <>
          <Button
            variant="ghost"
            className="h-auto self-start px-0 py-0"
            onPress={() => router.push("/music")}
          >
            <Text className="text-2xl text-primary">← Back to Articles</Text>
          </Button>

          <View className="gap-6">
            <View className="flex-row flex-wrap items-center gap-4">
              <View className="bg-primary px-4 py-3">
                <Text className="text-sm uppercase tracking-[0.18em] text-primary-foreground">
                  {article.category}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <UserIcon color="#98a2b3" size={18} />
                <Text className="text-xl text-muted-foreground">{article.author.name}</Text>
              </View>
              <Text className="text-xl text-muted-foreground">
                {new Date(article.published_at ?? article.created_at).toLocaleDateString()}
              </Text>
            </View>

            <Text variant="display" className="text-6xl leading-[60px]">
              {article.title}
            </Text>

            <View className="flex-row gap-4">
              {isSignedIn ? (
                <Button
                  variant="outline"
                  className="h-14 rounded-none border-border bg-card px-5"
                  onPress={() => saveArticle.mutate(article.id)}
                >
                  <BookmarkIcon color="#7CFC00" size={20} />
                  <Text className="text-xl text-primary">Save</Text>
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="h-14 rounded-none border-border bg-card px-5"
                onPress={() =>
                  Share.share({
                    message: `${article.title}\n/article/${article.slug}`,
                  })
                }
              >
                <Share2Icon color="#9400D3" size={20} />
                <Text className="text-xl text-secondary">Share</Text>
              </Button>
            </View>
          </View>

          {article.cover_image ? (
            <Image
              className="h-[520px] w-full rounded-[28px] bg-muted"
              resizeMode="cover"
              source={{ uri: article.cover_image }}
            />
          ) : null}

          <ArticleContent document={contentDoc} fallbackText={plainContent || article.excerpt} />

          <View className="gap-6 border-t border-border pt-8">
            <Text variant="h2" className="text-left">
              Comments ({comments?.length ?? 0})
            </Text>
            {isSignedIn ? (
              <View className="gap-3 rounded-[28px] border border-border bg-card px-5 py-5">
                <Input
                  placeholder="Join the conversation"
                  value={commentText}
                  onChangeText={setCommentText}
                />
                <Button
                  className="h-14 self-start rounded-none px-6"
                  onPress={() => {
                    if (!commentText.trim() || !slug) {
                      return;
                    }
                    createComment.mutate({ content: commentText.trim(), slug });
                    setCommentText("");
                  }}
                >
                  <Text className="text-base uppercase tracking-[0.18em] text-primary-foreground">
                    Post Comment
                  </Text>
                </Button>
              </View>
            ) : (
              <View className="gap-4 rounded-[28px] border border-border bg-card px-5 py-5">
                <Text className="text-2xl text-muted-foreground">Sign in to leave a comment</Text>
                <Button
                  className="h-14 self-start rounded-none px-6"
                  onPress={() => router.push("/(auth)/sign-in")}
                >
                  <Text className="text-base text-primary-foreground">Sign in to comment</Text>
                </Button>
                <Text className="text-lg leading-8 text-muted-foreground">
                  You'll return right here after signing in.
                </Text>
              </View>
            )}

            {(comments ?? []).length ? (
              <View className="gap-4">
                {(comments ?? []).map((comment) => (
                  <View key={comment.id} className="gap-3 border-b border-border pb-4">
                    <Text className="text-xl leading-8 text-foreground">{comment.content}</Text>
                    <Text
                      variant="mono"
                      className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {(comment.user_name ?? comment.user_email ?? "Reader").toUpperCase()} •{" "}
                      {new Date(comment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-2xl text-muted-foreground">
                No comments yet. Be the first to comment!
              </Text>
            )}
          </View>

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
        <Text className="text-lg text-muted-foreground">Loading story...</Text>
      )}
    </PublicScreen>
  );
}
