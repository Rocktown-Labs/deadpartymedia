import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function Home() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
  // TODO: Replace with Django API health check
  const healthCheck = "OK"; // Placeholder - will be replaced with actual API call

  return (
    <Container>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>DEAD PARTY MEDIA</Text>

          <View
            style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.statusCardTitle, { color: theme.text }]}>API Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: healthCheck === "OK" ? "#10b981" : "#ef4444" },
                ]}
              />
              <Text style={[styles.statusText, { color: theme.text, opacity: 0.7 }]}>
                {healthCheck === "OK" ? "Connected to API" : "API Disconnected"}
              </Text>
            </View>
          </View>
          <SignIn />
          <SignUp />
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
  },
  statusCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusCardTitle: {
    marginBottom: 8,
    fontWeight: "bold",
  },
});
