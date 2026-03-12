import { cn } from "@/lib/utils";
import { useSegments, router } from "expo-router";
import {
  CalendarDaysIcon,
  HomeIcon,
  Mic2Icon,
  Music2Icon,
  ShoppingBagIcon,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";

type NavItem = {
  icon: typeof HomeIcon;
  key: string;
  label: string;
  route: "/(tabs)" | "/events" | "/merch" | "/music" | "/artists";
};

const NAV_ITEMS: NavItem[] = [
  { icon: HomeIcon, key: "home", label: "Home", route: "/(tabs)" },
  { icon: Music2Icon, key: "music", label: "Music", route: "/music" },
  { icon: CalendarDaysIcon, key: "events", label: "Events", route: "/events" },
  { icon: ShoppingBagIcon, key: "merch", label: "Merch", route: "/merch" },
  { icon: Mic2Icon, key: "artists", label: "Artists", route: "/artists" },
];

function getActiveKey(segment: string | undefined) {
  if (!segment || segment === "(tabs)" || segment === "article" || segment === "about") {
    return "home";
  }
  if (segment === "music") {
    return "music";
  }
  if (segment === "events") {
    return "events";
  }
  if (segment === "merch" || segment === "cart") {
    return "merch";
  }
  if (segment === "artists" || segment === "writers" || segment === "contact") {
    return "artists";
  }

  return "home";
}

export function PublicBottomNav() {
  const segments = useSegments();
  const activeKey = getActiveKey(segments[0]);

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} className="border-t border-border bg-background">
      <View className="flex-row items-center justify-between px-2 pb-2 pt-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;

          return (
            <Pressable
              key={item.key}
              className="min-w-[64px] items-center justify-center gap-1 px-2 py-1.5"
              onPress={() => router.push(item.route)}
            >
              <Icon color={isActive ? "#7CFC00" : "#98a2b3"} size={24} strokeWidth={2.1} />
              <Text
                className={cn(
                  "text-xs",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
