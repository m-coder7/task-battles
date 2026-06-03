import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut, user } = useAuth();
  const { mode, setMode } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSignOut = async () => {
    await signOut();
    router.replace("/auth");
  };

  const themeOptions = [
    { key: "system" as const, label: "System", icon: "monitor" },
    { key: "midnight" as const, label: "Midnight", icon: "moon" },
    { key: "ember" as const, label: "Ember", icon: "sun" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="user" size={20} color={colors.mutedForeground} />
            <View style={styles.rowContent}>
              <Text style={[styles.rowLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Signed in as
              </Text>
              <Text style={[styles.rowValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {user?.email ?? "Anonymous"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            Appearance
          </Text>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setMode(opt.key)}
              style={[styles.themeRow, { borderBottomColor: colors.border }]}
            >
              <Feather name={opt.icon as any} size={18} color={colors.mutedForeground} />
              <Text style={[styles.themeLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {opt.label}
              </Text>
              <View style={styles.radio}>
                {mode === opt.key && (
                  <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Feather name="bell" size={20} color={colors.mutedForeground} />
              <View style={styles.rowContent}>
                <Text style={[styles.rowValue, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  Notifications
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutBtn, { backgroundColor: colors.destructive }]}
        >
          <Text style={[styles.signOutText, { fontFamily: "Inter_600SemiBold" }]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, marginBottom: 2 },
  rowValue: { fontSize: 15 },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  themeLabel: { flex: 1, fontSize: 15 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  signOutBtn: { height: 50, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 8 },
  signOutText: { color: "#FFFFFF", fontSize: 16 },
});
