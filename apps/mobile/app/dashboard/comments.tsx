import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useUserComments } from "@/lib/api/hooks";

export default function CommentsScreen() {
  const { data } = useUserComments();

  return (
    <ProtectedScreen role="fan">
      <ScreenView
        title="Comments"
        subtitle="Your comments and replies across Dead Party Media stories."
      >
        {(data?.results ?? []).map((comment) => (
          <Card key={comment.id}>
            <CardHeader>
              <CardTitle>{comment.article.title}</CardTitle>
            </CardHeader>
            <CardContent className="gap-2">
              <Text>{comment.content}</Text>
              <Text className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleString()}
              </Text>
            </CardContent>
          </Card>
        ))}
      </ScreenView>
    </ProtectedScreen>
  );
}
