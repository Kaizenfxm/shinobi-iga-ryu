import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { fightsApi, type FightData, type FightStats } from "@/lib/api";

const RESULT_COLORS: Record<string, string> = {
  victoria: "#22C55E",
  derrota: "#EF4444",
  empate: "#F59E0B",
};

const RESULT_LABELS: Record<string, string> = {
  victoria: "Victoria",
  derrota: "Derrota",
  empate: "Empate",
};

const METHOD_LABELS: Record<string, string> = {
  ko: "KO",
  tko: "TKO",
  sumision: "Sumisión",
  decision: "Decisión",
  decision_unanime: "Dec. Unánime",
  decision_dividida: "Dec. Dividida",
  descalificacion: "Descalificación",
  no_contest: "Sin Resultado",
};

const DISCIPLINE_LABELS: Record<string, string> = {
  mma: "MMA",
  box: "Box",
  jiujitsu: "Jiujitsu",
  muay_thai: "Muay Thai",
  ninjutsu: "Ninjutsu",
  otro: "Otro",
};

function StatsCard({ stats }: { stats: FightStats }) {
  return (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>Record</Text>
      <View style={styles.recordRow}>
        <View style={styles.recordItem}>
          <Text style={[styles.recordNumber, { color: "#22C55E" }]}>
            {stats.victorias}
          </Text>
          <Text style={styles.recordLabel}>V</Text>
        </View>
        <Text style={styles.recordSeparator}>-</Text>
        <View style={styles.recordItem}>
          <Text style={[styles.recordNumber, { color: "#EF4444" }]}>
            {stats.derrotas}
          </Text>
          <Text style={styles.recordLabel}>D</Text>
        </View>
        <Text style={styles.recordSeparator}>-</Text>
        <View style={styles.recordItem}>
          <Text style={[styles.recordNumber, { color: "#F59E0B" }]}>
            {stats.empates}
          </Text>
          <Text style={styles.recordLabel}>E</Text>
        </View>
      </View>
      <View style={styles.winRateContainer}>
        <View style={styles.winRateBarBg}>
          <View
            style={[
              styles.winRateBarFill,
              { width: `${stats.winPercentage}%` },
            ]}
          />
        </View>
        <Text style={styles.winRateText}>{stats.winPercentage}% victorias</Text>
      </View>
    </View>
  );
}

function FightCard({ fight }: { fight: FightData }) {
  const resultColor = RESULT_COLORS[fight.result] || "#888";
  const dateStr = new Date(fight.fightDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.fightCard}>
      <View style={styles.fightHeader}>
        <View style={[styles.resultBadge, { backgroundColor: resultColor + "22", borderColor: resultColor }]}>
          <Text style={[styles.resultText, { color: resultColor }]}>
            {RESULT_LABELS[fight.result] || fight.result}
          </Text>
        </View>
        <Text style={styles.fightDate}>{dateStr}</Text>
      </View>
      <Text style={styles.opponentName}>vs {fight.opponentName}</Text>
      <View style={styles.fightDetails}>
        <View style={styles.detailPill}>
          <Text style={styles.detailText}>
            {DISCIPLINE_LABELS[fight.discipline] || fight.discipline}
          </Text>
        </View>
        {fight.method && (
          <View style={styles.detailPill}>
            <Text style={styles.detailText}>
              {METHOD_LABELS[fight.method] || fight.method}
            </Text>
          </View>
        )}
        {fight.rounds && (
          <View style={styles.detailPill}>
            <Text style={styles.detailText}>R{fight.rounds}</Text>
          </View>
        )}
      </View>
      {fight.eventName && (
        <Text style={styles.eventName}>{fight.eventName}</Text>
      )}
      {fight.notes && <Text style={styles.notes}>{fight.notes}</Text>}
    </View>
  );
}

export default function FightsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, isAuthenticated } = useAuth();
  const [isFighter, setIsFighter] = useState(false);
  const [fights, setFights] = useState<FightData[]>([]);
  const [stats, setStats] = useState<FightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFights = useCallback(async () => {
    try {
      const data = await fightsApi.getMyFights();
      setIsFighter(data.isFighter);
      setFights(data.fights);
      setStats(data.stats);
    } catch {
      setIsFighter(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFights();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchFights]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFights();
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={[styles.centered, { paddingTop: (isWeb ? 67 : insets.top) + 24 }]}>
          <MaterialCommunityIcons name="boxing-glove" size={48} color="#333" />
          <Text style={styles.emptyText}>Inicia sesión para ver tu modo peleador</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.centered, { paddingTop: (isWeb ? 67 : insets.top) + 24 }]}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      </View>
    );
  }

  if (!isFighter) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.centered,
            { paddingTop: (isWeb ? 67 : insets.top) + 24, paddingBottom: 100 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
          }
        >
          <View style={styles.inactiveContainer}>
            <MaterialCommunityIcons name="sword-cross" size={64} color="#333" />
            <Text style={styles.inactiveTitle}>Modo Peleador</Text>
            <Text style={styles.inactiveSubtitle}>No Activado</Text>
            <View style={styles.divider} />
            <Text style={styles.inactiveDesc}>
              El modo peleador permite registrar tu historial de peleas y
              mostrar tu récord. Solicita la activación a un administrador.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (isWeb ? 67 : insets.top) + 16, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
        }
      >
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="sword-cross" size={24} color="#D4AF37" />
          <Text style={styles.headerTitle}>Modo Peleador</Text>
        </View>

        {stats && <StatsCard stats={stats} />}

        <Text style={styles.sectionTitle}>Historial de Peleas</Text>

        {fights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="boxing-glove" size={40} color="#333" />
            <Text style={styles.emptyText}>
              Aún no tienes peleas registradas
            </Text>
          </View>
        ) : (
          fights.map((fight) => <FightCard key={fight.id} fight={fight} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 22,
    color: "#D4AF37",
    letterSpacing: 3,
  },
  statsCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
    textAlign: "center",
  },
  recordRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  recordItem: {
    alignItems: "center",
  },
  recordNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
  },
  recordLabel: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#666",
    letterSpacing: 1,
    marginTop: 2,
  },
  recordSeparator: {
    fontFamily: "Inter_400Regular",
    fontSize: 24,
    color: "#333",
    marginHorizontal: 4,
  },
  winRateContainer: {
    alignItems: "center",
  },
  winRateBarBg: {
    width: "100%",
    height: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  winRateBarFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  winRateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#888",
  },
  sectionTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: 12,
  },
  fightCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  fightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  resultBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  resultText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  fightDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#666",
  },
  opponentName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 1,
  },
  fightDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  detailPill: {
    backgroundColor: "#111",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#AAA",
  },
  eventName: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontStyle: "italic",
  },
  notes: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },
  inactiveContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  inactiveTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 3,
    marginTop: 16,
  },
  inactiveSubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#555",
    letterSpacing: 2,
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "#222",
    marginVertical: 20,
  },
  inactiveDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#555",
    marginTop: 12,
    textAlign: "center",
  },
});
