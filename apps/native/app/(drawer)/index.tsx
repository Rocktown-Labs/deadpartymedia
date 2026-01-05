import { api } from "@dpmedia/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function Home() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
  const healthCheck = useQuery(api.healthCheck.get);
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.getCurrentUser, isAuthenticated ? {} : "skip");

  return (
    <Container>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>BETTER T STACK</Text>

          {user ? (
            <View
              style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.userHeader}>
                <Text style={[styles.userText, { color: theme.text }]}>
                  Welcome, <Text style={styles.userName}>{user.name}</Text>
                </Text>
              </View>
              <Text style={[styles.userEmail, { color: theme.text, opacity: 0.7 }]}>
                {user.email}
              </Text>
              <TouchableOpacity
                style={[styles.signOutButton, { backgroundColor: theme.notification }]}
                onPress={() => {
                  authClient.signOut();
                }}
              >
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <View
            style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.statusCardTitle, { color: theme.text }]}>API Status</Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: healthCheck ? "#10b981" : "#ef4444" },
                ]}
              />
              <Text style={[styles.statusText, { color: theme.text, opacity: 0.7 }]}>
                {healthCheck === undefined
                  ? "Checking..."
                  : healthCheck === "OK"
                    ? "Connected to API"
                    : "API Disconnected"}
              </Text>
            </View>
          </View>
          {!user && (
            <>
              <SignIn />
              <SignUp />
            </>
          )}
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
  card: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicator: {
    height: 8,
    width: 8,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 12,
  },
  userCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
  },
  userHeader: {
    marginBottom: 8,
  },
  userText: {
    fontSize: 16,
  },
  userName: {
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  signOutButton: {
    padding: 12,
  },
  signOutText: {
    color: "#ffffff",
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
