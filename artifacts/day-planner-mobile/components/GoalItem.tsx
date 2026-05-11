import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { type Goal, CATEGORY_META, DAY_LABELS } from "@/contexts/GoalsContext";
import { useColors } from "@/hooks/useColors";

interface GoalItemProps {
  goal: Goal;
  completed: boolean;
  onToggle: () => void;
  onPress?: () => void;
}

export function GoalItem({ goal, completed, onToggle, onPress }: GoalItemProps) {
  const colors = useColors();
  const meta = CATEGORY_META[goal.category];
  const colorHex = colors[meta.colorKey] as string;

  const handleToggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const repeatLabel = () => {
    if (!goal.repeat || goal.repeat === "none") return null;
    if (goal.repeat === "daily") return "Daily";
    if (goal.repeat === "weekdays") return "Weekdays";
    if (goal.repeat === "weekly") return "Weekly";
    if (goal.repeat === "custom") {
      const days = (goal.repeatDays ?? []).map((d) => DAY_LABELS[d]).join(", ");
      return days || "Custom";
    }
    return null;
  };

  const repeatText = repeatLabel();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <TouchableOpacity
        onPress={handleToggle}
        style={[
          styles.checkbox,
          {
            borderColor: completed ? colorHex : colors.border,
            backgroundColor: completed ? colorHex : "transparent",
          },
        ]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: completed ? colors.mutedForeground : colors.foreground,
              textDecorationLine: completed ? "line-through" : "none",
              fontFamily: "Inter_500Medium",
            },
          ]}
          numberOfLines={2}
        >
          {goal.title}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colorHex + "20" }]}>
            <Text style={[styles.badgeText, { color: colorHex, fontFamily: "Inter_500Medium" }]}>
              {meta.label}
            </Text>
          </View>
          {repeatText && (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {repeatText}
              </Text>
            </View>
          )}
          {goal.time && (
            <View style={[styles.badge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {goal.time}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold" as const,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
  },
});
