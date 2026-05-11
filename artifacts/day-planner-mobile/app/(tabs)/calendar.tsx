import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { addMonths, format, isSameDay, subMonths } from "date-fns";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EventCard } from "@/components/EventCard";
import { MonthGrid } from "@/components/MonthGrid";
import { useEvents } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, getEventsForDate } = useEvents();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = getEventsForDate(selectedDateStr);

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.date));
    return set;
  }, [events]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, paddingTop: topPad + 12 },
        ]}
      >
        <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {format(currentMonth, "MMMM yyyy")}
        </Text>
        <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MonthGrid
            month={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              if (!isSameDay(date, new Date(date.getFullYear(), currentMonth.getMonth()))) {
                setCurrentMonth(date);
              }
            }}
            eventDates={eventDates}
          />
        </View>

        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <Text style={[styles.eventsTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {format(selectedDate, "MMMM d")}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/event-form",
                  params: { date: selectedDateStr },
                })
              }
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {dayEvents.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: colors.border }]}>
              <Feather name="sun" size={24} color={colors.mutedForeground} />
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
    paddingBottom: 12,
  },
  monthTitle: {
    fontSize: 18,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  eventsSection: {
    marginBottom: 24,
  },
  eventsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventsTitle: {
    fontSize: 17,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
