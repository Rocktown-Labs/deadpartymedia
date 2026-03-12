import { ArticleCard } from "@/components/content/article-card";
import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { useArtistArticles, useCurrentArtist } from "@/lib/api/hooks";

export default function ArtistArticlesScreen() {
  const currentArtist = useCurrentArtist();
  const articles = useArtistArticles(currentArtist.data?.slug ?? "");

  return (
    <ProtectedScreen role="artist">
      <ScreenView title="My articles" subtitle="Coverage tied to your artist profile.">
        {(articles.data ?? []).map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </ScreenView>
    </ProtectedScreen>
  );
}
