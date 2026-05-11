import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface MonthGridProps {
  month: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates?: Set<string>;
}

export function MonthGrid({
  month,
  selectedDate,
  onSelectDate,
  eventDates = new Set(),
}: MonthGridProps) {
  const colors = useColors();

  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start, end });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((d, i) => (
          <Text
            key={i}
            style={[
              styles.weekday,
              { color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, month);
            const today = isToday(day);
            const hasEvent = eventDates.has(dateStr);

            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => onSelectDate(day)}
                style={[
                  styles.dayCell,
                  isSelected && {
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                  },
                  !isSelected && today && {
                    backgroundColor: colors.accent,
                    borderRadius: 20,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayText,
                    {
                      fontFamily: today
                        ? "Inter_700Bold"
                        : "Inter_400Regular",
                      color: isSelected
                        ? colors.primaryForeground
                        : isCurrentMonth
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  {format(day, "d")}
                </Text>
                {hasEvent && !isSelected && (
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
                {hasEvent && isSelected && (
                  <View
                    style={[styles.dot, { backgroundColor: "#FFFFFF" }]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    paddingVertical: 4,
  },
  week: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayText: {
    fontSize: 14,
  },
  dot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
