import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { format } from "date-fns";
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

import { GoalItem } from "@/components/GoalItem";
import {
  CATEGORY_META,
  type GoalCategory,
  isActiveToday,
  isCompletedToday,
  useGoals,
} from "@/contexts/GoalsContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: GoalCategory[] = ["must-do", "should-do", "nice-to-have"];

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { goals, toggleComplete } = useGoals();
  const [filter, setFilter] = useState<"all" | "today">("today");

  const today = format(new Date(), "yyyy-MM-dd");

  const filteredGoals = useMemo(() => {
    if (filter === "today") {
      return goals.filter((g) =>
        g.repeat !== "none" ? isActiveToday(g) : g.date === today
      );
    }
    return goals;
  }, [goals, filter, today]);

  const completed = filteredGoals.filter(isCompletedToday).length;
  const total = filteredGoals.length;

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
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          Goals
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/goal-form")}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + bottomPad }]}
      >
        {total > 0 && (
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {filter === "today" ? "Today's progress" : "Overall"}
              </Text>
              <Text style={[styles.progressCount, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {completed}/{total}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: total > 0 ? `${(completed / total) * 100}%` : "0%",
                  },
                ]}
              />
            </View>
          </View>
        )}

        <View style={[styles.filterRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {(["today", "all"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: filter === f ? colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: filter === f ? colors.primaryForeground : colors.mutedForeground,
                    fontFamily: filter === f ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {f === "today" ? "Today" : "All Goals"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {CATEGORIES.map((cat) => {
          const catGoals = filteredGoals.filter((g) => g.category === cat);
          if (catGoals.length === 0) return null;
          const meta = CATEGORY_META[cat];
          const catColor = colors[meta.colorKey] as string;

          return (
            <View key={cat} style={styles.category}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                <Text
                  style={[
                    styles.categoryTitle,
                    { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {meta.label}
                </Text>
                <Text
                  style={[styles.categoryCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                >
                  {catGoals.filter(isCompletedToday).length}/{catGoals.length}
                </Text>
              </View>
              {catGoals.map((goal) => (
                <GoalItem
                  key={goal.id}
                  goal={goal}
                  completed={isCompletedToday(goal)}
                  onToggle={() => toggleComplete(goal.id)}
                  onPress={() =>
                    router.push({ pathname: "/goal-form", params: { id: goal.id } })
                  }
                />
              ))}
            </View>
          );
        })}

        {filteredGoals.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Feather name="check-circle" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {filter === "today" ? "No goals for today" : "No goals yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Tap + to create your first goal
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 26,
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
    paddingTop: 16,
  },
  progressCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 13,
  },
  progressCount: {
    fontSize: 15,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  filterRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    marginBottom: 20,
    gap: 3,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
  },
  category: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryTitle: {
    fontSize: 15,
    flex: 1,
  },
  categoryCount: {
    fontSize: 13,
  },
  emptyState: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
