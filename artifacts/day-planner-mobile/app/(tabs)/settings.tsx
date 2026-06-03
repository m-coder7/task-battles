import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
        >
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 100 + bottomPad },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <Feather name="user" size={20} color={colors.mutedForeground} />
            <View style={styles.rowContent}>
              <Text
                style={[
                  styles.rowLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                Signed in as
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              >
                {user?.email ?? "Anonymous"}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.row}>
            <Feather name="moon" size={20} color={colors.mutedForeground} />
            <View style={styles.rowContent}>
              <Text
                style={[
                  styles.rowLabel,
                  { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                ]}
              >
                Theme
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.foreground, fontFamily: "Inter_500Medium" },
                ]}
              >
                System default
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={[
            styles.signOutBtn,
            { backgroundColor: colors.destructive },
          ]}
        >
          <Text
            style={[
              styles.signOutText,
              { fontFamily: "Inter_600SemiBold" },
            ]}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
  },
  signOutBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
