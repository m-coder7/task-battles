import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { format, isToday, addDays, startOfWeek } from "date-fns";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { GoalItem } from "@/components/GoalItem";
import { useEvents } from "@/contexts/EventsContext";
import { isActiveToday, isCompletedToday, useGoals } from "@/contexts/GoalsContext";
import { useColors } from "@/hooks/useColors";

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, getEventsForDate } = useEvents();
  const { goals, toggleComplete } = useGoals();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const weekStart = startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = getEventsForDate(selectedDateStr);

  const todayGoals = useMemo(() => {
    return goals.filter((g) =>
      g.repeat !== "none" ? isActiveToday(g) : g.date === selectedDateStr
    );
  }, [goals, selectedDateStr]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, paddingTop: topPad + 12, paddingBottom: 12 },
        ]}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {format(selectedDate, "EEEE")}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {format(selectedDate, "MMMM d, yyyy")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            router.push("/event-form");
          }}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.weekStrip}
        >
          {weekDays.map((day) => {
            const isSelected = format(day, "yyyy-MM-dd") === selectedDateStr;
            const today = isToday(day);
            const hasEvents = getEventsForDate(format(day, "yyyy-MM-dd")).length > 0;

            return (
              <TouchableOpacity
                key={format(day, "yyyy-MM-dd")}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setSelectedDate(day);
                }}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : today
                      ? colors.accent
                      : colors.card,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayChipLabel,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : colors.mutedForeground,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                >
                  {format(day, "EEE")}
                </Text>
                <Text
                  style={[
                    styles.dayChipNum,
                    {
                      color: isSelected
                        ? colors.primaryForeground
                        : colors.foreground,
                      fontFamily: isSelected || today ? "Inter_700Bold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {format(day, "d")}
                </Text>
                {hasEvents && (
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: isSelected
                          ? "#FFFFFF"
                          : colors.primary,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Events
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/event-form",
                  params: { date: selectedDateStr },
                })
              }
            >
              <Feather name="plus" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {dayEvents.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Feather name="calendar" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No events
              </Text>
            </View>
          ) : (
            dayEvents
              .sort((a, b) => {
                if (a.allDay && !b.allDay) return -1;
                if (!a.allDay && b.allDay) return 1;
                return a.startTime.localeCompare(b.startTime);
              })
              .map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() =>
                    router.push({
                      pathname: "/event-form",
                      params: { id: event.id },
                    })
                  }
                />
              ))
          )}
        </View>

        {todayGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Goals
            </Text>
            {todayGoals.map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                completed={isCompletedToday(goal)}
                onToggle={() => toggleComplete(goal.id)}
                onPress={() =>
                  router.push({
                    pathname: "/goal-form",
                    params: { id: goal.id },
                  })
                }
              />
            ))}
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 26,
  },
  headerSub: {
    fontSize: 14,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    paddingHorizontal: 20,
  },
  weekStrip: {
    paddingVertical: 12,
    gap: 8,
  },
  dayChip: {
    width: 48,
    height: 70,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    gap: 2,
  },
  dayChipLabel: {
    fontSize: 11,
  },
  dayChipNum: {
    fontSize: 17,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 0,
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
