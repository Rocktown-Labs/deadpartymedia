import { Link, Stack } from "expo-router";
import { Text, View, StyleSheet } from "react-native";

import { Container } from "@/components/container";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function NotFoundScreen() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Container>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>🤔</Text>
            <Text style={[styles.title, { color: theme.text }]}>Page Not Found</Text>
            <Text style={[styles.subtitle, { color: theme.text, opacity: 0.7 }]}>
              Sorry, the page you're looking for doesn't exist.
            </Text>
            <Link href="/" asChild>
              <Text
                style={[
                  styles.link,
                  { backgroundColor: `${theme.primary}1a`, color: theme.primary },
                ]}
              >
                Go to Home
              </Text>
            </Link>
          </View>
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },
  content: {
    alignItems: "center",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  link: {
    padding: 12,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
});
