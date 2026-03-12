import { PublicScreen } from "@/components/layout/public-screen";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export default function AboutScreen() {
  return (
    <PublicScreen contentClassName="gap-6 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">About</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Dead Party Media
        </Text>
      </View>
      <View className="gap-4 rounded-[28px] border border-border bg-card px-5 py-6">
        <Text className="text-lg leading-8 text-foreground">
          We cover artists across genres, highlight live events, publish features and interviews,
          and create ways for fans and artists to connect around the culture.
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          The mobile app mirrors the mobile web product while using native navigation, account
          flows, and cart behavior.
        </Text>
      </View>
    </PublicScreen>
  );
}
