import { ProductCard } from "@/components/content/product-card";
import { DataState } from "@/components/layout/data-state";
import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useProducts } from "@/lib/api/hooks";
import * as React from "react";
import { ScrollView, View } from "react-native";

export default function MerchTab() {
  const query = useProducts(24);
  const products = query.data ?? [];
  const categories = React.useMemo(() => {
    const all = new Set<string>();
    for (const product of products) {
      const [firstWord] = product.title.split(" ");
      if (firstWord) {
        all.add(firstWord);
      }
    }
    return ["All", ...Array.from(all)];
  }, [products]);
  const [category, setCategory] = React.useState("All");
  const filteredProducts =
    category === "All"
      ? products
      : products.filter((product) => product.title.startsWith(category));

  return (
    <PublicScreen contentClassName="gap-8 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Official Store</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Merch
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          Build your cart in-app, then finish checkout with Fourthwall.
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        <View className="flex-row gap-3 pr-4">
          {categories.map((item) => (
            <Button
              key={item}
              variant={category === item ? "default" : "outline"}
              className="h-12 rounded-none px-5"
              onPress={() => setCategory(item)}
            >
              <Text className="uppercase tracking-[0.18em]">{item}</Text>
            </Button>
          ))}
        </View>
      </ScrollView>
      <View className="gap-6">
        {query.error ? <DataState error={query.error} /> : null}
        {!query.error && filteredProducts.length === 0 ? (
          <DataState
            emptyMessage="No products were returned by the API."
            isLoading={query.isPending}
            loadingMessage="Loading merch..."
          />
        ) : null}
        {filteredProducts.map((product, index) => (
          <ProductCard key={product.id} motionIndex={index} product={product} />
        ))}
      </View>
    </PublicScreen>
  );
}
