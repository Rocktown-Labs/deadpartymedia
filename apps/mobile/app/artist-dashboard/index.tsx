import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useCurrentArtist } from "@/lib/api/hooks";
import { router } from "expo-router";
import { View } from "react-native";

export default function ArtistDashboardScreen() {
  const { data } = useCurrentArtist();

  return (
    <ProtectedScreen role="artist">
      <ScreenView
        title="Artist dashboard"
        subtitle="Manage your profile, coverage, and event presence."
      >
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Articles
              </Text>
              <Text variant="h4" className="text-left">
                {data?.article_count ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Events
              </Text>
              <Text variant="h4" className="text-left">
                {data?.event_count ?? 0}
              </Text>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardContent className="gap-1 pt-6">
              <Text className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Views
              </Text>
              <Text variant="h4" className="text-left">
                {data?.profile_views ?? 0}
              </Text>
            </CardContent>
          </Card>
        </View>

        <View className="gap-3">
          <Button onPress={() => router.push("/artist-dashboard/profile")}>
            <Text>Edit profile</Text>
          </Button>
          <Button variant="secondary" onPress={() => router.push("/artist-dashboard/articles")}>
            <Text>My articles</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push("/artist-dashboard/events")}>
            <Text>My events</Text>
          </Button>
        </View>
      </ScreenView>
    </ProtectedScreen>
  );
}
