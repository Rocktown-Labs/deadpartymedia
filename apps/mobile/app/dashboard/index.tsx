import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useDashboardStats } from "@/lib/api/hooks";
import { router } from "expo-router";
import { View } from "react-native";

export default function DashboardScreen() {
  const { data } = useDashboardStats();

  return (
    <ProtectedScreen role="fan">
      <ScreenView title="Dashboard" subtitle="Track your reading, comments, and saved stories.">
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Read
              </Text>
              <Text variant="h4" className="text-left">
                {data?.articles_read_count ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Saved
              </Text>
              <Text variant="h4" className="text-left">
                {data?.articles_saved_count ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Comments
              </Text>
              <Text variant="h4" className="text-left">
                {data?.comments_count ?? 0}
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="gap-3">
          <Button onPress={() => router.push("/dashboard/history")}>
            <Text>Reading history</Text>
          </Button>
          <Button variant="secondary" onPress={() => router.push("/dashboard/saved")}>
            <Text>Saved stories</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push("/dashboard/comments")}>
            <Text>My comments</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push("/dashboard/settings")}>
            <Text>Settings</Text>
          </Button>
        </View>
      </ScreenView>
    </ProtectedScreen>
  );
}
