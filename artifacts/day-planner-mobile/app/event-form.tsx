import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { addDays, format, parseISO, subDays } from "date-fns";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type CalendarEvent, EVENT_COLORS, useEvents } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";

export default function EventFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const { events, addEvent, updateEvent, deleteEvent } = useEvents();

  const existing = params.id ? events.find((e) => e.id === params.id) : null;
  const isEditing = !!existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState<Date>(
    existing ? parseISO(existing.date) : params.date ? parseISO(params.date) : new Date()
  );
  const [allDay, setAllDay] = useState(existing?.allDay ?? false);
  const [startTime, setStartTime] = useState(existing?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(existing?.endTime ?? "10:00");
  const [color, setColor] = useState<CalendarEvent["color"]>(existing?.color ?? "blue");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");
  const displayDate = format(date, "EEEE, MMMM d, yyyy");

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a title for this event.");
      return;
    }
    const data = {
      title: title.trim(),
      date: dateStr,
      startTime: allDay ? "00:00" : startTime,
      endTime: allDay ? "23:59" : endTime,
      color,
      description: description.trim() || undefined,
      allDay,
    };
    if (isEditing) {
      updateEvent(existing!.id, data);
    } else {
      addEvent(data);
    }
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    deleteEvent(existing!.id);
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
          {isEditing ? "Edit Event" : "New Event"}
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
            placeholder="Event title"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            returnKeyType="done"
            autoFocus={!isEditing}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Feather name="calendar" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              {displayDate}
            </Text>
            <View style={styles.dateControls}>
              <TouchableOpacity
                onPress={() => setDate(subDays(date, 1))}
                style={[styles.dateArrow, { backgroundColor: colors.muted }]}
              >
                <Feather name="chevron-left" size={16} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDate(addDays(date, 1))}
                style={[styles.dateArrow, { backgroundColor: colors.muted }]}
              >
                <Feather name="chevron-right" size={16} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <Feather name="clock" size={18} color={colors.mutedForeground} />
            <Text style={[styles.rowLabel, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              All day
            </Text>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {!allDay && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Start
                  </Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_500Medium" }]}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <Feather name="arrow-right" size={16} color={colors.mutedForeground} />
                <View style={styles.timeField}>
                  <Text style={[styles.timeLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    End
                  </Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.foreground, borderColor: colors.border, fontFamily: "Inter_500Medium" }]}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="10:00"
                    placeholderTextColor={colors.mutedForeground}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Color
          </Text>
          <View style={styles.colorRow}>
            {EVENT_COLORS.map(({ color: c, hex }) => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDot,
                  { backgroundColor: hex },
                  color === c && styles.colorDotSelected,
                ]}
              >
                {color === c && (
                  <Feather name="check" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Notes
          </Text>
          <TextInput
            style={[styles.descInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="Add notes..."
            placeholderTextColor={colors.mutedForeground}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
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
              {deleteConfirm ? "Tap again to confirm" : "Delete Event"}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
  },
  dateControls: {
    flexDirection: "row",
    gap: 6,
  },
  dateArrow: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeField: {
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 11,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "center",
  },
  cardLabel: {
    fontSize: 12,
    marginBottom: -4,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  descInput: {
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: "top",
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
