import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { type WeekDay } from "@/hooks/useRivalry";
import { useColors } from "@/hooks/useColors";

interface WeekBarChartProps {
  data: WeekDay[];
  myName?: string;
  rivalName?: string;
}

const BAR_WIDTH = 10;
const BAR_GAP = 3;
const GROUP_GAP = 8;
const MAX_HEIGHT = 60;

export function WeekBarChart({ data, myName = "Me", rivalName = "Rival" }: WeekBarChartProps) {
  const colors = useColors();

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          No history yet
        </Text>
      </View>
    );
  }

  const svgWidth = data.length * (BAR_WIDTH * 2 + BAR_GAP + GROUP_GAP);

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {myName}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.eventOrange }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {rivalName}
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={svgWidth} height={MAX_HEIGHT + 24}>
          {data.map((day, i) => {
            const groupX = i * (BAR_WIDTH * 2 + BAR_GAP + GROUP_GAP);
            const myH = day.myRate >= 0 ? Math.max(3, (day.myRate / 100) * MAX_HEIGHT) : 0;
            const rivalH = day.rivalRate >= 0 ? Math.max(3, (day.rivalRate / 100) * MAX_HEIGHT) : 0;

            return (
              <React.Fragment key={day.date}>
                <Rect
                  x={groupX}
                  y={MAX_HEIGHT - myH}
                  width={BAR_WIDTH}
                  height={myH || 0}
                  rx={3}
                  fill={day.myRate >= 0 ? colors.primary : colors.border}
                />
                <Rect
                  x={groupX + BAR_WIDTH + BAR_GAP}
                  y={MAX_HEIGHT - rivalH}
                  width={BAR_WIDTH}
                  height={rivalH || 0}
                  rx={3}
                  fill={day.rivalRate >= 0 ? colors.eventOrange : colors.border}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        <View style={[styles.labels, { width: svgWidth }]}>
          {data.map((day) => (
            <Text
              key={day.date}
              style={[
                styles.label,
                { width: BAR_WIDTH * 2 + BAR_GAP + GROUP_GAP, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {day.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  chartContainer: {
    alignItems: "flex-start",
  },
  labels: {
    flexDirection: "row",
    marginTop: 4,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
  },
  empty: {
    height: 80,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
  },
});
