import "@/global.css";

import { env } from "@dpmedia/env/native";
import { NAV_THEME } from "@/lib/theme";
import { mobileQueryClient } from "@/lib/api/hooks";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { Slot, router, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import * as React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { Text } from "@/components/ui/text";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Expo Router and React Navigation can run without native screen primitives.
// Disable them until the current iOS screen config crash is resolved upstream.
enableScreens(false);

export default function RootLayout() {
  const publishableKey = env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const activeTheme = NAV_THEME.dark;
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_900Black,
    JetBrainsMono_500Medium,
  });

  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(activeTheme.colors.background).catch(() => {
      // Ignore platform-specific failures; the app can still render normally.
    });
  }, [activeTheme.colors.background]);

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // The splash screen may already be hidden during fast refresh.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (!publishableKey) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text variant="h4" className="text-center">
          Configure Clerk to run the mobile app
        </Text>
        <Text className="mt-3 text-center text-muted-foreground">
          Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in apps/mobile/.env before starting Expo.
        </Text>
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <QueryClientProvider client={mobileQueryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={activeTheme}>
            <View className="dark flex-1 bg-background">
              <StatusBar style="light" />
              <Routes />
              <PortalHost />
            </View>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { isSignedIn, isLoaded } = useAuth();
  const [showFallback, setShowFallback] = React.useState(false);
  const segments = useSegments();
  const topSegment = segments[0];
  const inAuthGroup = topSegment === "(auth)";
  const inProtectedRoute =
    topSegment === "dashboard" || topSegment === "artist-dashboard" || topSegment === "onboarding";

  React.useEffect(() => {
    if (isLoaded) {
      setShowFallback(true);
      return;
    }

    const timeout = setTimeout(() => {
      setShowFallback(true);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [isLoaded]);

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn && inProtectedRoute) {
      router.replace("/(auth)/sign-in");
      return;
    }

    if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [inAuthGroup, inProtectedRoute, isLoaded, isSignedIn]);

  if (!isLoaded) {
    if (!showFallback) {
      return null;
    }

    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text variant="h4" className="text-center">
          Loading Dead Party Media
        </Text>
        <Text className="mt-3 text-center text-muted-foreground">
          Waiting for auth and app services to finish booting.
        </Text>
      </View>
    );
  }

  return <Slot />;
}
