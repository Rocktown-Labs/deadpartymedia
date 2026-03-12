import { ArticleCard } from "@/components/content/article-card";
import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { useReadArticles } from "@/lib/api/hooks";

export default function ReadingHistoryScreen() {
  const { data } = useReadArticles();

  return (
    <ProtectedScreen role="fan">
      <ScreenView title="Reading history" subtitle="Every story you opened from the mobile app.">
        {(data?.results ?? []).map((item) => (
          <ArticleCard key={item.id} article={item.article} />
        ))}
      </ScreenView>
    </ProtectedScreen>
  );
}
