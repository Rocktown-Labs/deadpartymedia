import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";

import { authClient } from "@/lib/auth-client";
import { NAV_THEME } from "@/lib/constants";
import { getErrorMessage } from "@/lib/error-message";
import { useColorScheme } from "@/lib/use-color-scheme";

function SignIn() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setIsLoading(true);
    setError(null);

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError(error: unknown) {
          setError(getErrorMessage(error) ?? "Failed to sign in");
          setIsLoading(false);
        },
        onFinished() {
          setIsLoading(false);
        },
        onSuccess() {
          setEmail("");
          setPassword("");
        },
      },
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Sign In</Text>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.notification + "20" }]}>
          <Text style={[styles.errorText, { color: theme.notification }]}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
        ]}
        placeholder="Email"
        placeholderTextColor={theme.text}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.background, borderColor: theme.border, color: theme.text },
        ]}
        placeholder="Password"
        placeholderTextColor={theme.text}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={handleLogin}
        disabled={isLoading}
        style={[styles.button, { backgroundColor: theme.primary, opacity: isLoading ? 0.5 : 1 }]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
  },
  card: {
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  errorContainer: {
    marginBottom: 12,
    padding: 8,
  },
  errorText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 12,
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
});

export { SignIn };
