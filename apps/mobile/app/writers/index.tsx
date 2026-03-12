import { PublicScreen } from "@/components/layout/public-screen";
import { Text } from "@/components/ui/text";
import { useWriters } from "@/lib/api/hooks";
import { View } from "react-native";

export default function WritersScreen() {
  const { data } = useWriters();

  return (
    <PublicScreen contentClassName="gap-6 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Editorial Team</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Writers
        </Text>
      </View>
      {(data ?? []).map((writer) => (
        <View key={writer.id} className="gap-2 rounded-[28px] border border-border bg-card px-5 py-6">
          <Text variant="h3" className="text-left">
            {writer.name}
          </Text>
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">
              {writer.articleCount} published stories · {writer.role}
            </Text>
            <Text className="leading-6 text-muted-foreground">
              {writer.bio ?? "More writer profiles coming soon."}
            </Text>
          </View>
        </View>
      ))}
    </PublicScreen>
  );
}
