import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ArrowRightIcon } from "lucide-react-native";
import { View } from "react-native";

export function EditorialSectionHeading({
  ctaLabel,
  eyebrow,
  onPress,
  title,
}: {
  ctaLabel?: string;
  eyebrow?: string;
  onPress?: () => void;
  title: string;
}) {
  return (
    <View className="gap-4">
      {eyebrow ? <Text variant="eyebrow">{eyebrow}</Text> : null}
      <View className="flex-row items-end justify-between gap-4">
        <Text variant="h2" className="flex-1 text-left">
          {title}
        </Text>
        {ctaLabel && onPress ? (
          <Button
            variant="ghost"
            className="h-auto flex-row items-center gap-2 px-0 py-0"
            onPress={onPress}
          >
            <Text className="text-lg font-medium text-primary">{ctaLabel}</Text>
            <ArrowRightIcon color="#7CFC00" size={22} />
          </Button>
        ) : null}
      </View>
    </View>
  );
}
