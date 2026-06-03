import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { addMonths, format, isSameDay, subMonths, parseISO } from "date-fns";
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

type CalendarView = "month" | "day";

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, getEventsForDate } = useEvents();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = getEventsForDate(selectedDateStr);

  const eventDates = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(e.date));
    return set;
  }, [events]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const hours = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM
  }, []);

  const eventsByHour = useMemo(() => {
    const map: Record<number, typeof dayEvents> = {};
    hours.forEach((h) => { map[h] = []; });
    dayEvents.forEach((e) => {
      if (!e.allDay) {
        const h = Number(e.startTime.split(":")[0]);
        if (map[h]) map[h].push(e);
      }
    });
    return map;
  }, [dayEvents, hours]);

  const allDayEvents = dayEvents.filter((e) => e.allDay);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, paddingTop: topPad + 12 },
        ]}
      >
        {view === "month" ? (
          <>
            <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {format(currentMonth, "MMMM yyyy")}
            </Text>
            <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <Feather name="chevron-right" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setSelectedDate(subMonths(selectedDate, 0) ? new Date(selectedDate.getTime() - 86400000) : selectedDate)}>
              <Feather name="chevron-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {format(selectedDate, "EEEE, MMMM d")}
            </Text>
            <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
              <Feather name="chevron-right" size={22} color={colors.foreground} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.segmentWrap}>
        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          {(["month", "day"] as CalendarView[]).map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={[
                styles.segmentBtn,
                view === v && { backgroundColor: colors.card },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color: view === v ? colors.foreground : colors.mutedForeground,
                    fontFamily: view === v ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {v === "month" ? "Month" : "Day"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        {view === "month" && (
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
        )}

        {view === "day" && (
          <View style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {allDayEvents.length > 0 && (
              <View style={[styles.allDayRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.allDayLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  All-day
                </Text>
                {allDayEvents.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => router.push({ pathname: "/event-form", params: { id: e.id } })}
                    style={[styles.allDayPill, { backgroundColor: colors.primary + "20" }]}
                  >
                    <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {e.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {hours.map((h) => (
              <TouchableOpacity
                key={h}
                onPress={() =>
                  router.push({
                    pathname: "/event-form",
                    params: { date: selectedDateStr, time: `${String(h).padStart(2, "0")}:00` },
                  })
                }
                style={[styles.hourRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.hourLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </Text>
                <View style={styles.hourEvents}>
                  {eventsByHour[h].map((e) => (
                    <TouchableOpacity
                      key={e.id}
                      onPress={() => router.push({ pathname: "/event-form", params: { id: e.id } })}
                      style={[styles.hourEvent, { backgroundColor: colors.primary + "15" }]}
                    >
                      <Text style={{ color: colors.primary, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                        {e.title}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                        {e.startTime} – {e.endTime}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {view === "month" && (
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
    paddingBottom: 12,
  },
  monthTitle: { fontSize: 18 },
  segmentWrap: { paddingHorizontal: 20, marginBottom: 12 },
  segment: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentText: { fontSize: 13 },
  scroll: { paddingHorizontal: 20 },
  calendarCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  dayCard: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: "hidden" },
  allDayRow: { padding: 12, borderBottomWidth: 1, gap: 6 },
  allDayLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  allDayPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  hourRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, minHeight: 52 },
  hourLabel: { width: 50, fontSize: 12, marginTop: 2 },
  hourEvents: { flex: 1, gap: 4 },
  hourEvent: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  eventsSection: { marginBottom: 24 },
  eventsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventsTitle: { fontSize: 17 },
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
  emptyText: { fontSize: 14 },
});
