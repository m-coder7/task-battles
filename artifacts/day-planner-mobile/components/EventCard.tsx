import * as Haptics from "expo-haptics";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { type CalendarEvent } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";

const EVENT_HEX: Record<string, string> = {
  blue: "#3B82F6",
  red: "#EF4444",
  green: "#10B981",
  orange: "#F59E0B",
  purple: "#8B5CF6",
  pink: "#EC4899",
};

interface EventCardProps {
  event: CalendarEvent;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const colors = useColors();
  const hex = EVENT_HEX[event.color] ?? EVENT_HEX.blue;
  const bgHex = hex + "20";

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, { backgroundColor: bgHex, borderLeftColor: hex }]}
    >
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
          numberOfLines={1}
        >
          {event.title}
        </Text>
        {!event.allDay && (
          <Text
            style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            {event.startTime} – {event.endTime}
          </Text>
        )}
        {event.allDay && (
          <Text
            style={[styles.time, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            All day
          </Text>
        )}
      </View>
      {event.description ? (
        <Text
          style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={1}
        >
          {event.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 13,
  },
  desc: {
    fontSize: 12,
    marginTop: 4,
  },
});
