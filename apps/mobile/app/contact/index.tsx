import { PublicScreen } from "@/components/layout/public-screen";
import { Text } from "@/components/ui/text";
import { View } from "react-native";

export default function ContactScreen() {
  return (
    <PublicScreen contentClassName="gap-6 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Contact</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Reach Us
        </Text>
      </View>
      <View className="gap-4 rounded-[28px] border border-border bg-card px-5 py-6">
        <Text className="text-lg leading-8 text-foreground">
          Email editorial, artist relations, or support through the main Dead Party Media
          channels.
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          This screen is ready for final contact details, social links, and submission intake
          copy.
        </Text>
      </View>
    </PublicScreen>
  );
}
