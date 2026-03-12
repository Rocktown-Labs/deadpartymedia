import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAddToCart, useProduct } from "@/lib/api/hooks";
import { router, useLocalSearchParams } from "expo-router";
import { ShoppingCartIcon } from "lucide-react-native";
import * as React from "react";
import { Image, ScrollView, View, useWindowDimensions } from "react-native";

export default function ProductDetailScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { data: product } = useProduct(handle);
  const addToCart = useAddToCart();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = React.useState<Record<string, string>>({});
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);

  React.useEffect(() => {
    if (!product?.variants?.[0]) {
      return;
    }

    const next: Record<string, string> = {};
    for (const option of product.variants[0].selectedOptions) {
      next[option.name] = option.value;
    }
    setSelected(next);
  }, [product?.id, product?.variants]);

  const activeVariant =
    product?.variants.find((variant) =>
      variant.selectedOptions.every((option) => selected[option.name] === option.value),
    ) ?? product?.variants[0];

  const gallery = product?.images?.length ? product.images : product ? [product.featuredImage] : [];

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      {product ? (
        <>
          <Button
            variant="ghost"
            className="h-auto self-start px-0 py-0"
            onPress={() => router.push("/merch")}
          >
            <Text className="text-2xl text-primary">← Back to Merch</Text>
          </Button>

          <View className="gap-5">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const width = event.nativeEvent.layoutMeasurement.width || 1;
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(nextIndex);
              }}
            >
              {gallery.map((image) => (
                <View key={image.url} style={{ width: Math.max(width - 32, 1) }}>
                  <Image
                    className="h-[420px] w-full rounded-[28px] bg-muted"
                    resizeMode="cover"
                    source={{ uri: image.url }}
                  />
                </View>
              ))}
            </ScrollView>

            {gallery.length > 1 ? (
              <View className="flex-row justify-center gap-3">
                {gallery.map((image, index) => (
                  <View
                    key={`${image.url}-${index}`}
                    className={
                      index === activeImageIndex
                        ? "h-4 w-4 rounded-full bg-primary"
                        : "h-4 w-4 rounded-full bg-white/40"
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>

          <View className="gap-5 border border-border bg-card px-5 py-6">
            <Text variant="display" className="text-6xl leading-[60px]">
              {product.title}
            </Text>
            <View className="flex-row items-center gap-5">
              <View className="rounded-[28px] bg-primary px-6 py-5">
                <Text variant="display" className="text-4xl text-primary-foreground">
                  ${activeVariant?.price.amount ?? product.priceRange.maxVariantPrice.amount}
                </Text>
              </View>
              <Text className="text-2xl text-muted-foreground">
                Starting at ${product.priceRange.minVariantPrice.amount}
              </Text>
            </View>

            {product.options.map((option) => (
              <View key={option.id} className="gap-4 border-t border-border pt-5">
                <Text variant="eyebrow" className="text-white">
                  {option.name}
                </Text>
                <View className="flex-row flex-wrap gap-3">
                  {option.values.map((value) => {
                    const isSelected = selected[option.name] === value;
                    return (
                      <Button
                        key={`${option.id}-${value}`}
                        variant={isSelected ? "default" : "outline"}
                        className="h-14 rounded-[18px] border-border px-6"
                        onPress={() =>
                          setSelected((current) => ({
                            ...current,
                            [option.name]: value,
                          }))
                        }
                      >
                        <Text className={isSelected ? "text-primary-foreground" : "text-white"}>
                          {value}
                        </Text>
                      </Button>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text className="text-lg leading-8 text-muted-foreground">{product.description}</Text>

            <Button
              className="mt-2 h-16 rounded-none"
              disabled={!activeVariant}
              onPress={() => {
                if (!activeVariant) {
                  return;
                }

                addToCart.mutate({ merchandiseId: activeVariant.id, quantity: 1 });
              }}
            >
              <ShoppingCartIcon color="#050505" size={24} />
              <Text className="text-lg uppercase tracking-[0.18em] text-primary-foreground">
                Add to Cart
              </Text>
            </Button>
          </View>
        </>
      ) : (
        <Text className="text-lg text-muted-foreground">Loading product...</Text>
      )}
    </PublicScreen>
  );
}
