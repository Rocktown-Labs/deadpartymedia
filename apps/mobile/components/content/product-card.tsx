import type { Product } from "@dpmedia/contracts";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { router } from "expo-router";
import * as React from "react";
import { Image, Pressable, View } from "react-native";
import Animated, {
  FadeInRight,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export function ProductCard({
  className,
  compact = false,
  motionIndex = 0,
  product,
}: {
  className?: string;
  compact?: boolean;
  motionIndex?: number;
  product: Product;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  const entering = React.useMemo(() => FadeInRight.duration(260).delay(motionIndex * 60), [motionIndex]);

  const minPrice = product.priceRange.minVariantPrice.amount;
  const maxPrice = product.priceRange.maxVariantPrice.amount;
  const priceLabel = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;

  return (
    <NativeOnlyAnimatedView entering={entering} layout={LinearTransition.springify().damping(18)}>
      <Animated.View style={animatedStyle}>
        <Pressable
          className={cn("gap-4 overflow-hidden", className)}
          onPress={() => router.push(`/merch/${product.handle}`)}
          onPressIn={() => {
            scale.set(withSpring(0.985, { damping: 18, stiffness: 220 }));
          }}
          onPressOut={() => {
            scale.set(withSpring(1, { damping: 18, stiffness: 220 }));
          }}
        >
          <View className={cn("relative overflow-hidden bg-black", compact ? "rounded-[22px]" : "rounded-[28px]")}>
            {product.featuredImage.url ? (
              <Image
                className={cn(
                  compact ? "h-[300px] w-full bg-muted" : "h-[430px] w-full bg-muted",
                )}
                resizeMode="cover"
                source={{ uri: product.featuredImage.url }}
              />
            ) : null}
            <View className="absolute left-4 top-4 bg-secondary px-4 py-2">
              <Text className="text-xs uppercase tracking-[0.18em] text-secondary-foreground">
                Merch
              </Text>
            </View>
            <View className="absolute inset-x-0 bottom-0 h-28 bg-black/60" />
          </View>
          <View className={compact ? "gap-2 px-1 pb-2 pt-2" : "gap-3 px-1 pb-2 pt-2"}>
            <Text className={compact ? "text-[28px] font-black leading-9" : "text-4xl font-black"}>
              {product.title}
            </Text>
            {!compact ? (
              <Text className="text-base leading-8 text-muted-foreground" numberOfLines={2}>
                {product.description}
              </Text>
            ) : null}
            <View className="flex-row items-center justify-between gap-4">
              <Text className={compact ? "text-lg font-medium text-muted-foreground" : "text-xl font-medium text-muted-foreground"}>
                {priceLabel}
              </Text>
              <Text className={compact ? "text-lg font-medium text-primary" : "text-xl font-medium text-primary"}>
                SHOP NOW →
              </Text>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </NativeOnlyAnimatedView>
  );
}
