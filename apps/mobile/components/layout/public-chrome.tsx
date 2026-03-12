import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCart, useOnboardingProfile } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { ShoppingBagIcon, UserCircle2Icon } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";

const logoImage = require("../../assets/images/icon.png");

function getIssueLabel() {
  const now = new Date();
  return `ISSUE ${now.getMonth() + 1}.${now.getFullYear()}`;
}

export function PublicChrome() {
  const issueLabel = getIssueLabel();
  const { isSignedIn } = useAuth();
  const { data: cart } = useCart();
  const { data: profile } = useOnboardingProfile();

  function openDashboard() {
    if (!profile?.onboardingComplete) {
      router.push("/onboarding");
      return;
    }

    router.push(profile.role === "artist" ? "/artist-dashboard" : "/dashboard");
  }

  return (
    <View className="border-b border-border bg-background px-4 pb-4 pt-3">
      <Text variant="mono" className="text-[15px] text-muted-foreground">
        {issueLabel}
      </Text>
      <View className="mt-4 flex-row items-center justify-between gap-3">
        <Pressable onPress={() => router.push("/(tabs)")}>
          <Image source={logoImage} className="h-20 w-20" resizeMode="contain" />
        </Pressable>
        <View className="flex-row items-center justify-end gap-3">
          <Pressable
            className="relative h-14 w-14 items-center justify-center rounded-[18px] border border-border bg-background"
            onPress={() => router.push("/cart")}
          >
            <ShoppingBagIcon color="#f4f4f5" size={22} />
            {cart?.cart?.totalQuantity ? (
              <View className="absolute -right-2 -top-2 min-w-5 rounded-full bg-primary px-1.5 py-0.5">
                <Text className="text-[10px] text-primary-foreground">
                  {cart.cart.totalQuantity}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {isSignedIn ? (
            <>
              <Button
                variant="outline"
                className="h-14 rounded-[18px] border-border bg-background px-6"
                onPress={openDashboard}
              >
                <Text className="text-sm uppercase tracking-[0.16em]">Dashboard</Text>
              </Button>
              <View className="rounded-[18px] border border-border bg-background p-1">
                <UserMenu />
              </View>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="h-14 rounded-[18px] border-border bg-background px-6"
                onPress={() => router.push("/(auth)/sign-in")}
              >
                <Text className="text-sm uppercase tracking-[0.16em]">Sign In</Text>
              </Button>
              <Button
                className="h-14 rounded-[18px] px-6"
                onPress={() => router.push("/(auth)/sign-up")}
              >
                <Text className="text-sm uppercase tracking-[0.16em]">Sign Up</Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
