import { ProtectedScreen } from "@/components/layout/protected-screen";
import { ScreenView } from "@/components/layout/screen-view";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useSession } from "@/lib/api/hooks";
import { useAuth } from "@clerk/clerk-expo";

export default function SettingsScreen() {
  const { data } = useSession();
  const { signOut } = useAuth();

  return (
    <ProtectedScreen role="fan">
      <ScreenView title="Settings" subtitle="Account and session controls for your fan profile.">
        <Card>
          <CardContent className="gap-2 pt-6">
            <Text className="text-sm text-muted-foreground">Signed in as</Text>
            <Text variant="h4" className="text-left">
              {data?.name ?? "Account"}
            </Text>
            <Text className="text-sm text-muted-foreground">{data?.email}</Text>
          </CardContent>
        </Card>
        <Button variant="destructive" onPress={() => signOut()}>
          <Text>Sign out</Text>
        </Button>
      </ScreenView>
    </ProtectedScreen>
  );
}
