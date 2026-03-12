import { Text } from "@/components/ui/text";
import { useOnboardingProfile } from "@/lib/api/hooks";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { View } from "react-native";

export function ProtectedScreen({
  allowIncomplete = false,
  children,
  role,
}: {
  allowIncomplete?: boolean;
  children: React.ReactNode;
  role?: "artist" | "fan";
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const profileQuery = useOnboardingProfile();

  if (!isLoaded || (isSignedIn && profileQuery.isLoading)) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">Loading your account...</Text>
      </View>
    );
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  const profile = profileQuery.data;
  if (!profile) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!allowIncomplete && !profile.onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  if (role === "fan" && profile.role !== "fan") {
    return <Redirect href={profile.role === "artist" ? "/artist-dashboard" : "/(tabs)"} />;
  }

  if (role === "artist" && profile.role !== "artist") {
    return <Redirect href={profile.role === "fan" ? "/dashboard" : "/(tabs)"} />;
  }

  return <>{children}</>;
}
