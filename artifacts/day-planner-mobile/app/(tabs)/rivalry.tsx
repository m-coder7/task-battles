import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { WeekBarChart } from "@/components/WeekBarChart";
import { useGoals } from "@/contexts/GoalsContext";
import { useColors } from "@/hooks/useColors";
import { useRivalry } from "@/hooks/useRivalry";

const REACTIONS = ["🔥", "💀", "🏆", "😤", "😴", "🤡"];

export default function RivalryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTodayStats } = useGoals();
  const myStats = getTodayStats();

  const rivalry = useRivalry(myStats);

  const [name, setName] = useState("");
  const [rivalCodeInput, setRivalCodeInput] = useState("");
  const [newName, setNewName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleCreateProfile = () => {
    if (!name.trim()) return;
    rivalry.createProfile(name.trim());
  };

  const handleConnectRival = () => {
    if (!rivalCodeInput.trim()) return;
    rivalry.connectRival(rivalCodeInput.trim());
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Leave Rivalry",
      "Are you sure you want to disconnect from your rival?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => rivalry.disconnectRival(),
        },
      ]
    );
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Delete Profile",
      "This will permanently delete your rivalry profile and all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => rivalry.deleteProfile(),
        },
      ]
    );
  };

  const handleRename = () => {
    if (!newName.trim()) return;
    rivalry.changeDisplayName(newName.trim());
    setNewName("");
    setShowRenameInput(false);
  };

  const handleReaction = (emoji: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rivalry.sendReaction(emoji);
  };

  const rate =
    myStats.total > 0
      ? Math.round((myStats.completed / myStats.total) * 100)
      : 0;
  const rivalRate =
    rivalry.rivalDailyStats?.total != null && rivalry.rivalDailyStats.total > 0
      ? rivalry.rivalDailyStats.rate
      : null;

  if (!rivalry.initialized) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!rivalry.profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Rivalry
          </Text>
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}>
          <View style={[styles.setupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={40} color={colors.primary} />
            <Text style={[styles.setupTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Create Your Profile
            </Text>
            <Text style={[styles.setupSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Challenge a friend to beat your daily goal completion rate
            </Text>

            {rivalry.error && (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20" }]}>
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {rivalry.error}
                </Text>
              </View>
            )}

            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: "Inter_400Regular" },
              ]}
              placeholder="Your display name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateProfile}
            />

            <TouchableOpacity
              onPress={handleCreateProfile}
              disabled={rivalry.loading || !name.trim()}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: !name.trim() ? 0.5 : 1 },
              ]}
            >
              {rivalry.loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Create Profile
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!rivalry.rivalInfo) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Rivalry
          </Text>
        </View>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{rivalry.profile.displayName[0].toUpperCase()}</Text>
            </View>
            <Text style={[styles.profileName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {rivalry.profile.displayName}
            </Text>
            <View style={[styles.codeBox, { backgroundColor: colors.muted }]}>
              <Text style={[styles.codeLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Your invite code
              </Text>
              <Text style={[styles.code, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                {rivalry.profile.inviteCode}
              </Text>
            </View>
          </View>

          <View style={[styles.connectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.connectTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Add a Rival
            </Text>
            <Text style={[styles.connectSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Enter your friend's invite code to start competing
            </Text>

            {rivalry.error && (
              <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20" }]}>
                <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                  {rivalry.error}
                </Text>
              </View>
            )}

            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, fontFamily: "Inter_400Regular" },
              ]}
              placeholder="Friend's invite code"
              placeholderTextColor={colors.mutedForeground}
              value={rivalCodeInput}
              onChangeText={(t) => setRivalCodeInput(t.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleConnectRival}
            />

            <TouchableOpacity
              onPress={handleConnectRival}
              disabled={rivalry.loading || !rivalCodeInput.trim()}
              style={[
                styles.primaryBtn,
                { backgroundColor: colors.primary, opacity: !rivalCodeInput.trim() ? 0.5 : 1 },
              ]}
            >
              {rivalry.loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.primaryBtnText, { fontFamily: "Inter_600SemiBold" }]}>
                  Connect
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteProfile} style={styles.dangerLink}>
              <Text style={[styles.dangerLinkText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
                Delete profile
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, paddingBottom: 12 },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Rivalry
        </Text>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
          <Feather name="settings" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {showSettings && (
        <View style={[styles.settingsDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {showRenameInput ? (
            <View style={styles.renameRow}>
              <TextInput
                style={[styles.renameInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                value={newName}
                onChangeText={setNewName}
                placeholder="New display name"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <TouchableOpacity onPress={handleRename} style={[styles.renameBtn, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => setShowRenameInput(true)}
            >
              <Feather name="edit-2" size={15} color={colors.foreground} />
              <Text style={[styles.settingsItemText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                Change name
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.settingsItem} onPress={handleDisconnect}>
            <Feather name="user-minus" size={15} color={colors.destructive} />
            <Text style={[styles.settingsItemText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              Leave rivalry
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteProfile}>
            <Feather name="trash-2" size={15} color={colors.destructive} />
            <Text style={[styles.settingsItemText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
              Delete profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        {rivalry.incomingReaction && (
          <TouchableOpacity
            onPress={rivalry.clearIncomingReaction}
            style={[styles.reactionBanner, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}
          >
            <Text style={styles.reactionEmoji}>{rivalry.incomingReaction.emoji}</Text>
            <Text style={[styles.reactionBannerText, { color: colors.accentForeground, fontFamily: "Inter_500Medium" }]}>
              {rivalry.incomingReaction.fromName} sent you a reaction!
            </Text>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <View style={styles.compareRow}>
          <StatCard
            name={rivalry.profile.displayName}
            rate={rate}
            completed={myStats.completed}
            total={myStats.total}
            streak={rivalry.myStreak}
            isMe
            colors={colors}
          />
          <View style={[styles.vsCircle, { borderColor: colors.border }]}>
            <Text style={[styles.vsText, { color: colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
              VS
            </Text>
          </View>
          <StatCard
            name={rivalry.rivalInfo.displayName}
            rate={rivalRate ?? 0}
            completed={rivalry.rivalDailyStats?.completed ?? 0}
            total={rivalry.rivalDailyStats?.total ?? 0}
            streak={rivalry.rivalStreak}
            isMe={false}
            colors={colors}
          />
        </View>

        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            7-Day History
          </Text>
          <WeekBarChart
            data={rivalry.weekHistory}
            myName={rivalry.profile.displayName}
            rivalName={rivalry.rivalInfo.displayName}
          />
        </View>

        {rivalry.myMonthlyStats && (
          <View style={[styles.monthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {format(new Date(), "MMMM")} Averages
            </Text>
            <View style={styles.monthRow}>
              <View style={styles.monthStat}>
                <Text style={[styles.monthRate, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {rivalry.myMonthlyStats.avgRate}%
                </Text>
                <Text style={[styles.monthLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {rivalry.profile.displayName}
                </Text>
              </View>
              <View style={styles.monthStat}>
                <Text style={[styles.monthRate, { color: colors.eventOrange, fontFamily: "Inter_700Bold" }]}>
                  {rivalry.rivalMonthlyStats?.avgRate ?? "—"}%
                </Text>
                <Text style={[styles.monthLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {rivalry.rivalInfo.displayName}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.reactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Send a Reaction
          </Text>
          <View style={styles.reactRow}>
            {REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReaction(emoji)}
                style={[styles.reactBtn, { backgroundColor: colors.muted }]}
              >
                <Text style={styles.reactEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  name: string;
  rate: number;
  completed: number;
  total: number;
  streak: number;
  isMe: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}

function StatCard({ name, rate, completed, total, streak, isMe, colors }: StatCardProps) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: isMe ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.statAvatar,
          { backgroundColor: isMe ? colors.primary : colors.eventOrange },
        ]}
      >
        <Text style={styles.statAvatarText}>{name[0]?.toUpperCase()}</Text>
      </View>
      <Text
        style={[styles.statName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
        numberOfLines={1}
      >
        {name}
      </Text>
      <Text style={[styles.statRate, { color: isMe ? colors.primary : colors.eventOrange, fontFamily: "Inter_700Bold" }]}>
        {rate}%
      </Text>
      <Text style={[styles.statSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {completed}/{total} goals
      </Text>
      {streak > 0 && (
        <View style={[styles.streakBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.streakText, { color: colors.accentForeground, fontFamily: "Inter_500Medium" }]}>
            🔥 {streak}d
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 26,
  },
  settingsDropdown: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 8,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
  },
  settingsItemText: {
    fontSize: 14,
  },
  renameRow: {
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  renameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  renameBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  reactionBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 4,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionBannerText: {
    flex: 1,
    fontSize: 13,
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statAvatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold" as const,
  },
  statName: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: "100%",
  },
  statRate: {
    fontSize: 26,
  },
  statSub: {
    fontSize: 11,
    textAlign: "center",
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
  },
  streakText: {
    fontSize: 11,
  },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  vsText: {
    fontSize: 11,
  },
  chartCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  monthCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  monthRow: {
    flexDirection: "row",
    gap: 16,
  },
  monthStat: {
    alignItems: "center",
    gap: 2,
  },
  monthRate: {
    fontSize: 28,
  },
  monthLabel: {
    fontSize: 12,
  },
  reactCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  reactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reactBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reactEmoji: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 15,
  },
  setupCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  setupTitle: {
    fontSize: 22,
    marginTop: 8,
  },
  setupSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  primaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  errorBox: {
    width: "100%",
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold" as const,
  },
  profileName: {
    fontSize: 20,
  },
  codeBox: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  codeLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  code: {
    fontSize: 24,
    letterSpacing: 4,
  },
  connectCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  connectTitle: {
    fontSize: 17,
  },
  connectSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  dangerLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  dangerLinkText: {
    fontSize: 13,
  },
});
