import { PublicBottomNav } from "@/components/layout/public-bottom-nav";
import { PublicChrome } from "@/components/layout/public-chrome";
import { ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

export function PublicScreen({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <PublicChrome />
      <ScrollView
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 104 }}
      >
        <View className={contentClassName ?? "gap-10 px-4 pb-8 pt-5"}>{children}</View>
      </ScrollView>
      <View className="absolute bottom-0 left-0 right-0">
        <PublicBottomNav />
      </View>
    </SafeAreaView>
  );
}
