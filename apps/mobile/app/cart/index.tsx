import { PublicScreen } from "@/components/layout/public-screen";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCart, useOpenCheckout, useRemoveCartItem, useUpdateCartItem } from "@/lib/api/hooks";
import { View } from "react-native";

export default function CartScreen() {
  const { data } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const openCheckout = useOpenCheckout();
  const cart = data?.cart;

  return (
    <PublicScreen contentClassName="gap-6 pb-8 pt-5">
      <View className="gap-4">
        <Text variant="eyebrow">Official Store</Text>
        <Text variant="display" className="text-6xl leading-[60px]">
          Cart
        </Text>
        <Text className="text-lg leading-8 text-muted-foreground">
          Manage quantities here, then complete checkout on Fourthwall.
        </Text>
      </View>
      {!cart || cart.lines.length === 0 ? (
        <View className="rounded-[28px] border border-border bg-card px-5 py-6">
          <Text className="text-xl text-muted-foreground">Your cart is empty.</Text>
        </View>
      ) : (
        <>
          {cart.lines.map((line) => (
            <View key={line.id} className="gap-4 rounded-[28px] border border-border bg-card px-5 py-6">
              <Text variant="h3" className="text-left">
                {line.merchandise.product.title}
              </Text>
              <View className="gap-4">
                <Text className="text-sm text-muted-foreground">{line.merchandise.title}</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl">${line.cost.totalAmount.amount}</Text>
                  <View className="flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        updateItem.mutate({
                          merchandiseId: line.merchandise.id,
                          quantity: Math.max(0, line.quantity - 1),
                        })
                      }
                    >
                      <Text>-</Text>
                    </Button>
                    <Button size="sm" variant="secondary">
                      <Text>{line.quantity}</Text>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() =>
                        updateItem.mutate({
                          merchandiseId: line.merchandise.id,
                          quantity: line.quantity + 1,
                        })
                      }
                    >
                      <Text>+</Text>
                    </Button>
                  </View>
                </View>
                <Button
                  variant="destructive"
                  size="sm"
                  onPress={() => removeItem.mutate(line.merchandise.id)}
                >
                  <Text>Remove</Text>
                </Button>
              </View>
            </View>
          ))}
          <View className="gap-2 rounded-[28px] border border-border bg-card px-5 py-6">
            <Text className="text-sm text-muted-foreground">Subtotal</Text>
            <Text variant="h3" className="text-left">
              ${cart.cost.totalAmount.amount}
            </Text>
          </View>
          <Button className="h-14 rounded-none" onPress={() => openCheckout.mutate(data?.checkout_url ?? null)}>
            <Text className="text-base uppercase tracking-[0.18em] text-primary-foreground">
              Continue to Checkout
            </Text>
          </Button>
        </>
      )}
    </PublicScreen>
  );
}
