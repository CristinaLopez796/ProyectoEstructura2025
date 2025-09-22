import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Patient } from "../models/Patient";
import { HistoryItem } from "./HistoryScreen";
import { COLORS } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";

type Props = { queue: Patient[]; history: HistoryItem[] };

function fmtMs(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "0m";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export default function StatsScreen({ queue, history }: Props) {
  const queueCounts = useMemo(() => {
    const c = { p1: 0, p2: 0, p3: 0 };
    for (const p of queue) {
      if (p.urgencia === 1) c.p1++;
      else if (p.urgencia === 2) c.p2++;
      else c.p3++;
    }
    return c;
  }, [queue]);

  const { histCounts, avgWaitAll, avgByPriority, maxCountQueue, maxCountHist } = useMemo(() => {
    const counts = { p1: 0, p2: 0, p3: 0 };
    const sumWait = { p1: 0, p2: 0, p3: 0 };
    let totalWait = 0;
    let totalN = 0;

    for (const h of history) {
      const pr = h.paciente.urgencia;
      const waited = h.waitedMs ?? 0;
      if (pr === 1) { counts.p1++; sumWait.p1 += waited; }
      else if (pr === 2) { counts.p2++; sumWait.p2 += waited; }
      else { counts.p3++; sumWait.p3 += waited; }
      totalWait += waited;
      totalN++;
    }

    const avgAll = totalN ? totalWait / totalN : 0;
    const avgP1 = counts.p1 ? sumWait.p1 / counts.p1 : 0;
    const avgP2 = counts.p2 ? sumWait.p2 / counts.p2 : 0;
    const avgP3 = counts.p3 ? sumWait.p3 / counts.p3 : 0;

    const maxQ = Math.max(queueCountsMax(queue), 1);
    const maxH = Math.max(counts.p1, counts.p2, counts.p3, 1);

    return {
      histCounts: counts,
      avgWaitAll: avgAll,
      avgByPriority: { p1: avgP1, p2: avgP2, p3: avgP3 },
      maxCountQueue: maxQ,
      maxCountHist: maxH,
    };
  }, [history, queue]);

  const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => {
    const widthPct = Math.max(4, Math.min(100, (value / (max || 1)) * 100));
    return (
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: color }]} />
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.bg }} contentContainerStyle={{ paddingBottom: 16 }}>
      {/* En espera */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people-outline" size={18} color={COLORS.tabActive} />
          <Text style={styles.title}>En espera</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>{queue.length}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p1 }]}><Text style={styles.pillText}>Alta (1)</Text></View>
          <Text style={styles.countText}>{queueCounts.p1}</Text>
        </View>
        <Bar value={queueCounts.p1} max={maxCountQueue} color={COLORS.priority.p1} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p2 }]}><Text style={styles.pillText}>Media (2)</Text></View>
          <Text style={styles.countText}>{queueCounts.p2}</Text>
        </View>
        <Bar value={queueCounts.p2} max={maxCountQueue} color={COLORS.priority.p2} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p3 }]}><Text style={styles.pillText}>Baja (3)</Text></View>
          <Text style={styles.countText}>{queueCounts.p3}</Text>
        </View>
        <Bar value={queueCounts.p3} max={maxCountQueue} color={COLORS.priority.p3} />
      </View>

      {/* Atendidos */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={18} color={COLORS.tabActive} />
          <Text style={styles.title}>Atendidos</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>{history.length}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p1 }]}><Text style={styles.pillText}>Alta (1)</Text></View>
          <Text style={styles.countText}>{histCounts.p1}</Text>
        </View>
        <Bar value={histCounts.p1} max={maxCountHist} color={COLORS.priority.p1} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p2 }]}><Text style={styles.pillText}>Media (2)</Text></View>
          <Text style={styles.countText}>{histCounts.p2}</Text>
        </View>
        <Bar value={histCounts.p2} max={maxCountHist} color={COLORS.priority.p2} />

        <View style={styles.metricRow}>
          <View style={[styles.pillLeft, { backgroundColor: COLORS.priority.p3 }]}><Text style={styles.pillText}>Baja (3)</Text></View>
          <Text style={styles.countText}>{histCounts.p3}</Text>
        </View>
        <Bar value={histCounts.p3} max={maxCountHist} color={COLORS.priority.p3} />
      </View>

      {/* Tiempos promedio */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stopwatch-outline" size={18} color={COLORS.tabActive} />
          <Text style={styles.title}>Tiempo promedio de espera</Text>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Global</Text>
          <Text style={[styles.metricValue, { color: COLORS.tabActive }]}>{fmtMs(avgWaitAll)}</Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Alta (1)</Text>
          <Text style={styles.metricValue}>{fmtMs(avgByPriority.p1)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Media (2)</Text>
          <Text style={styles.metricValue}>{fmtMs(avgByPriority.p2)}</Text>
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.metricLabel}>Baja (3)</Text>
          <Text style={styles.metricValue}>{fmtMs(avgByPriority.p3)}</Text>
        </View>

        <Text style={styles.note}>
          Nota: la espera se calcula desde el registro (queuedAt) hasta la atención.
          Si no hay queuedAt (pacientes antiguos), se considera 0m.
        </Text>
      </View>
    </ScrollView>
  );
}

function queueCountsMax(queue: Patient[]) {
  let p1 = 0, p2 = 0, p3 = 0;
  for (const p of queue) {
    if (p.urgencia === 1) p1++;
    else if (p.urgencia === 2) p2++;
    else p3++;
  }
  return Math.max(p1, p2, p3);
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EAECF0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  title: { fontWeight: "800", fontSize: 16, color: "#0F172A" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  metricLabel: { color: "#667085", fontSize: 14 },
  metricValue: { color: "#0F172A", fontSize: 14, fontWeight: "700" },
  separator: { height: 1, backgroundColor: "#EAECF0", marginVertical: 10 },
  metricRow: { marginTop: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pillLeft: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: "#FFFFFF", fontWeight: "700" },
  countText: { fontWeight: "800", color: "#0F172A" },
  barTrack: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 999, overflow: "hidden", marginTop: 6 },
  barFill: { height: 8, borderRadius: 999 },
  note: { color: "#667085", fontSize: 12, marginTop: 12 },
});
