import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";

export default function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === "signin"
        ? await signIn(email.trim(), password.trim())
        : await signUp(email.trim(), password.trim());

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      router.replace("/(tabs)");
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 40, paddingBottom: 40 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Feather name="shield" size={48} color={colors.primary} />
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Task Battles
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </Text>
        </View>

        {error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.destructive + "20" },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                { color: colors.destructive, fontFamily: "Inter_400Regular" },
              ]}
            >
              {error}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <TextInput
            style={[
              styles.input,
              {
                color: colors.foreground,
                borderColor: colors.border,
                backgroundColor: colors.background,
                fontFamily: "Inter_400Regular",
              },
            ]}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !email.trim() || !password.trim()}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: !email.trim() || !password.trim() ? 0.5 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.submitBtnText,
                  { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {mode === "signin" ? "Sign In" : "Sign Up"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          style={styles.toggleBtn}
        >
          <Text
            style={[
              styles.toggleText,
              { color: colors.primary, fontFamily: "Inter_400Regular" },
            ]}
          >
            {mode === "signin"
              ? "Don't have an account? Sign Up"
              : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 15,
  },
  errorBox: {
    width: "100%",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 12,
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  submitBtn: {
    width: "100%",
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  toggleBtn: {
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
  },
});
