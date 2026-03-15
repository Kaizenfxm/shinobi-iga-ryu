import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { FightStats } from "@/lib/api";

export default function FightRecord({ stats }: { stats: FightStats }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.line} />
        <Text style={styles.title}>戦 RECORD DE PELEAS 戦</Text>
        <View style={styles.line} />
      </View>
      <View style={styles.recordRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#22C55E" }]}>{stats.victorias}</Text>
          <Text style={styles.statLabel}>V</Text>
        </View>
        <Text style={styles.sep}>·</Text>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#EF4444" }]}>{stats.derrotas}</Text>
          <Text style={styles.statLabel}>D</Text>
        </View>
        <Text style={styles.sep}>·</Text>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#F59E0B" }]}>{stats.empates}</Text>
          <Text style={styles.statLabel}>E</Text>
        </View>
      </View>
      <View style={styles.barRow}>
        <Text style={styles.totalLabel}>{stats.total} peleas</Text>
        <View style={styles.barContainer}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${stats.winPercentage}%` as unknown as number }]} />
          </View>
          <Text style={styles.pct}>{stats.winPercentage}%</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 10,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#D4AF37",
    opacity: 0.3,
  },
  title: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 12,
    color: "#D4AF37",
    letterSpacing: 3,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
    minWidth: 32,
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 26,
  },
  statLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#666",
    letterSpacing: 2,
    marginTop: 2,
  },
  sep: {
    fontFamily: "Inter_400Regular",
    fontSize: 20,
    color: "#333",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },
  totalLabel: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
  },
  barContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  barBg: {
    flex: 1,
    height: 3,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  pct: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#D4AF37",
  },
});
