import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { format, subYears } from "date-fns";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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

import { useAuth } from "@/hooks/useAuth";
import { useColors } from "@/hooks/useColors";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  mood: string;
  tags: string[];
}

const MOODS = [
  { emoji: "😄", label: "Great" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😔", label: "Low" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🔥", label: "Fired up" },
  { emoji: "🤯", label: "Overwhelmed" },
];

const TEMPLATES = [
  "What am I grateful for today?",
  "What challenged me today?",
  "What did I learn today?",
  "How did I move closer to my goals?",
];

export default function DiaryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const storageKey = `diary_${user?.id ?? "anon"}`;

  const [entries, setEntries] = useState<Record<string, DiaryEntry>>({});
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((raw) => {
      if (raw) setEntries(JSON.parse(raw));
      setLoaded(true);
    });
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(entries));
  }, [entries, loaded, storageKey]);

  const currentEntry = entries[selectedDate];

  useEffect(() => {
    setContent(currentEntry?.content ?? "");
    setMood(currentEntry?.mood ?? "");
  }, [selectedDate, currentEntry]);

  const saveEntry = useCallback(() => {
    if (!content.trim() && !mood) {
      Alert.alert("Empty entry", "Write something or pick a mood before saving.");
      return;
    }
    setEntries((prev) => ({
      ...prev,
      [selectedDate]: {
        id: prev[selectedDate]?.id ?? `${selectedDate}_${Date.now()}`,
        date: selectedDate,
        content: content.trim(),
        mood,
        tags: [],
      },
    }));
  }, [content, mood, selectedDate]);

  const streak = useMemo(() => {
    const dates = Object.keys(entries).sort().reverse();
    let s = 0;
    const today = new Date();
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff === i) s++;
      else break;
    }
    return s;
  }, [entries]);

  const onThisDay = useMemo(() => {
    const today = new Date(selectedDate);
    const past: DiaryEntry[] = [];
    for (let y = 1; y <= 5; y++) {
      const d = format(subYears(today, y), "yyyy-MM-dd");
      if (entries[d]) past.push(entries[d]);
    }
    return past;
  }, [entries, selectedDate]);

  const filteredEntries = useMemo(() => {
    const all = Object.values(entries).sort((a, b) => b.date.localeCompare(a.date));
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((e) => e.content.toLowerCase().includes(q) || e.mood.toLowerCase().includes(q));
  }, [entries, search]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(format(d, "yyyy-MM-dd"));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Diary
        </Text>
        {streak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.streakText, { fontFamily: "Inter_600SemiBold" }]}>
              🔥 {streak} day streak
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + bottomPad }]}
      >
        <View style={[styles.dateNav, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigateDay(-1)}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.dateText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            {selectedDate === todayStr ? "Today" : format(new Date(selectedDate), "EEEE, MMMM d")}
          </Text>
          <TouchableOpacity onPress={() => navigateDay(1)}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.moodRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m.label}
              onPress={() => setMood(mood === m.label ? "" : m.label)}
              style={[
                styles.moodBtn,
                mood === m.label && { backgroundColor: colors.primary + "25", borderColor: colors.primary },
                { borderColor: colors.border },
              ]}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={[styles.moodLabel, { color: mood === m.label ? colors.primary : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.entryInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
          multiline
          placeholder="Write about your day..."
          placeholderTextColor={colors.mutedForeground}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />

        <View style={styles.templateRow}>
          {TEMPLATES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setContent((prev) => (prev ? prev + "\n\n" : "") + t + " ")}
              style={[styles.templateChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <Text style={[styles.templateText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={saveEntry}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_600SemiBold" }]}>
            {currentEntry ? "Update Entry" : "Save Entry"}
          </Text>
        </TouchableOpacity>

        {onThisDay.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
              On This Day
            </Text>
            {onThisDay.map((e) => (
              <View key={e.id} style={[styles.pastEntry, { borderBottomColor: colors.border }]}>
                <Text style={[styles.pastDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {format(new Date(e.date), "MMMM d, yyyy")}
                </Text>
                <Text style={[styles.pastMood, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  {MOODS.find((m) => m.label === e.mood)?.emoji} {e.mood}
                </Text>
                <Text style={[styles.pastContent, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                  {e.content}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
              placeholder="Search entries..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {filteredEntries.slice(0, 20).map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => setSelectedDate(e.date)}
              style={[styles.historyEntry, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.historyDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {format(new Date(e.date), "MMM d, yyyy")}
              </Text>
              <Text style={[styles.historyMood, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                {MOODS.find((m) => m.label === e.mood)?.emoji} {e.mood}
              </Text>
              <Text style={[styles.historyContent, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                {e.content}
              </Text>
            </TouchableOpacity>
          ))}
          {filteredEntries.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              No entries yet. Start writing above!
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 26 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  streakText: { color: "#FFFFFF", fontSize: 12 },
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, marginBottom: 4 },
  dateText: { fontSize: 15 },
  moodRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, padding: 12, borderRadius: 12, borderWidth: 1 },
  moodBtn: { alignItems: "center", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, minWidth: 68 },
  moodEmoji: { fontSize: 20 },
  moodLabel: { fontSize: 10, marginTop: 2 },
  entryInput: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120, fontSize: 15, textAlignVertical: "top" },
  templateRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  templateChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  templateText: { fontSize: 12 },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15 },
  section: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  pastEntry: { paddingVertical: 8, borderBottomWidth: 1 },
  pastDate: { fontSize: 11, marginBottom: 2 },
  pastMood: { fontSize: 13, marginBottom: 2 },
  pastContent: { fontSize: 13, lineHeight: 18 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  searchInput: { flex: 1, fontSize: 14 },
  historyEntry: { paddingVertical: 8, borderBottomWidth: 1 },
  historyDate: { fontSize: 11, marginBottom: 1 },
  historyMood: { fontSize: 12, marginBottom: 2 },
  historyContent: { fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 20 },
});
