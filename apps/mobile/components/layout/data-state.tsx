import { buildApiUrl } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Request failed.";
}

export function DataState({
  emptyMessage,
  error,
  isLoading,
  loadingMessage = "Loading...",
}: {
  emptyMessage?: string;
  error?: unknown;
  isLoading?: boolean;
  loadingMessage?: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="gap-2 pt-6">
          <Text>{loadingMessage}</Text>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="gap-2 pt-6">
          <Text className="font-medium text-destructive">Unable to load data</Text>
          <Text className="text-sm text-muted-foreground">{getErrorMessage(error)}</Text>
          <Text className="text-xs text-muted-foreground">API: {buildApiUrl("/api/posts")}</Text>
        </CardContent>
      </Card>
    );
  }

  if (emptyMessage) {
    return (
      <Card>
        <CardContent className="gap-2 pt-6">
          <Text className="text-muted-foreground">{emptyMessage}</Text>
        </CardContent>
      </Card>
    );
  }

  return null;
}
