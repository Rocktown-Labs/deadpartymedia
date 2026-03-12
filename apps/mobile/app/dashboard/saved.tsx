import { ArticleCard } from "@/components/content/article-card";
import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { useSavedArticles } from "@/lib/api/hooks";

export default function SavedStoriesScreen() {
  const { data } = useSavedArticles();

  return (
    <ProtectedScreen role="fan">
      <ScreenView title="Saved stories" subtitle="Stories you bookmarked for later.">
        {(data?.results ?? []).map((item) => (
          <ArticleCard key={item.id} article={item.article} />
        ))}
      </ScreenView>
    </ProtectedScreen>
  );
}
