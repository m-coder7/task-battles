import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { format, parseISO } from "date-fns";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CATEGORY_META,
  DAY_LABELS,
  type Goal,
  type GoalCategory,
  type GoalRepeat,
  REPEAT_OPTIONS,
  useGoals,
} from "@/contexts/GoalsContext";
import { useEvents } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: GoalCategory[] = ["must-do", "should-do", "nice-to-have"];

export default function GoalFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();

  const existing = params.id ? goals.find((g) => g.id === params.id) : null;
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [category, setCategory] = useState<GoalCategory>(existing?.category ?? "should-do");
  const [repeat, setRepeat] = useState<GoalRepeat>(existing?.repeat ?? "none");
  const [repeatDays, setRepeatDays] = useState<number[]>(existing?.repeatDays ?? []);
  const [time, setTime] = useState(existing?.time ?? "");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    existing?.notificationsEnabled ?? false
  );
  const [notificationMessage, setNotificationMessage] = useState(
    existing?.notificationMessage ?? "Time to work on your goal!"
  );
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { addEvent } = useEvents();

  const today = format(new Date(), "yyyy-MM-dd");

  const toggleDay = (day: number) => {
    setRepeatDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  function formatTimeInput(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
    return digits;
  }

  const CATEGORY_EVENT_COLOR: Record<GoalCategory, import("@/contexts/EventsContext").EventColor> = {
    "must-do": "red",
    "should-do": "orange",
    "nice-to-have": "blue",
  };

  function addHour(timeStr: string) {
    const [h, m] = timeStr.split(":").map(Number);
    const nh = (h + 1) % 24;
    return `${String(nh).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for this goal.");
      return;
    }
    const data = {
      title: title.trim(),
      category,
      date: existing?.date ?? today,
      time: time.trim() || undefined,
      repeat,
      repeatDays: repeat === "custom" ? repeatDays : undefined,
      notificationsEnabled,
      notificationMessage: notificationMessage.trim() || "Time to work on your goal!",
    };
    if (isEditing) {
      updateGoal(existing!.id, data);
    } else {
      addGoal(data);
      if (addToCalendar) {
        const start = data.time ?? "09:00";
        addEvent({
          title: data.title,
          date: data.date,
          startTime: start,
          endTime: addHour(start),
          color: CATEGORY_EVENT_COLOR[data.category],
          description: `Goal: ${data.title}`,
          allDay: false,
          repeat: "none",
        });
      }
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    deleteGoal(existing!.id);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.back();
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancelText, { color: colors.primary, fontFamily: "Inter_400Regular" }]}>
            Cancel
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {isEditing ? "Edit Goal" : "New Goal"}
        </Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.saveText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + bottomPad }]}
      >
        <View style={[styles.field, { borderBottomColor: colors.border }]}>
          <TextInput
            style={[styles.titleInput, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
            placeholder="Goal title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            autoFocus={!isEditing}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Priority
          </Text>
          <View style={styles.segmentRow}>
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const catColor = colors[meta.colorKey] as string;
              const isSelected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: isSelected ? catColor : colors.muted,
                      borderColor: isSelected ? catColor : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected ? "#FFFFFF" : colors.mutedForeground,
                        fontFamily: isSelected ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Repeat
          </Text>
          <View style={styles.repeatOptions}>
            {REPEAT_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setRepeat(value)}
                style={[
                  styles.repeatOption,
                  {
                    backgroundColor:
                      repeat === value ? colors.primary + "15" : colors.muted,
                    borderColor:
                      repeat === value ? colors.primary : "transparent",
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.repeatOptionText,
                    {
                      color: repeat === value ? colors.primary : colors.mutedForeground,
                      fontFamily: repeat === value ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {repeat === "custom" && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={[
                    styles.dayBtn,
                    {
                      backgroundColor: repeatDays.includes(i)
                        ? colors.primary
                        : colors.muted,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayBtnText,
                      {
                        color: repeatDays.includes(i)
                          ? "#FFFFFF"
                          : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {label[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="clock" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Time (optional)
            </Text>
            <TextInput
              style={[
                styles.timeInput,
                { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" },
              ]}
              value={time}
              onChangeText={(t) => setTime(formatTimeInput(t))}
              placeholder="09:00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="calendar" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Add to Calendar
            </Text>
            <Switch
              value={addToCalendar}
              onValueChange={setAddToCalendar}
              trackColor={{ true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="bell" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              Notifications
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          {notificationsEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TextInput
                style={[
                  styles.msgInput,
                  { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_400Regular" },
                ]}
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                placeholder="Notification message"
                placeholderTextColor={colors.mutedForeground}
              />
            </>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity
            onPress={handleDelete}
            style={[
              styles.deleteBtn,
              {
                backgroundColor: deleteConfirm
                  ? colors.destructive
                  : colors.destructive + "15",
              },
            ]}
          >
            <Feather
              name="trash-2"
              size={16}
              color={deleteConfirm ? "#FFFFFF" : colors.destructive}
            />
            <Text
              style={[
                styles.deleteBtnText,
                {
                  color: deleteConfirm ? "#FFFFFF" : colors.destructive,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              {deleteConfirm ? "Tap again to confirm" : "Delete Goal"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cancelText: { fontSize: 16 },
  headerTitle: { fontSize: 16 },
  saveText: { fontSize: 16 },
  scroll: {
    padding: 20,
    gap: 12,
  },
  field: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 4,
  },
  titleInput: {
    fontSize: 22,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardLabel: {
    fontSize: 12,
  },
  segmentRow: {
    flexDirection: "column",
    gap: 8,
  },
  segment: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: 14,
  },
  repeatOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  repeatOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  repeatOptionText: {
    fontSize: 13,
  },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  dayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBtnText: {
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    width: 70,
    textAlign: "center",
  },
  divider: { height: 1 },
  msgInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  deleteBtnText: {
    fontSize: 15,
  },
});
