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
import FightRecord from "@/components/FightRecord";

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

function FightCard({ fight }: { fight: FightData }) {
  const resultColor = RESULT_COLORS[fight.result] || "#888";
  const dateStr = new Date(fight.fightDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={[styles.fightCard, { borderLeftColor: resultColor }]}>
      <View style={styles.fightHeader}>
        <Text style={[styles.resultText, { color: resultColor }]}>
          {RESULT_LABELS[fight.result] || fight.result}
        </Text>
        <Text style={styles.fightDate}>{dateStr}</Text>
      </View>
      <Text style={styles.opponentName}>vs {fight.opponentName}</Text>
      <Text style={styles.fightMeta}>
        {DISCIPLINE_LABELS[fight.discipline] || fight.discipline}
        {fight.method ? ` · ${METHOD_LABELS[fight.method] || fight.method}` : ""}
        {fight.rounds ? ` · R${fight.rounds}` : ""}
      </Text>
      {fight.eventName && <Text style={styles.eventName}>{fight.eventName}</Text>}
      {fight.notes && <Text style={styles.notes}>{fight.notes}</Text>}
    </View>
  );
}

export default function FightsScreen({ skipSafeArea = false }: { skipSafeArea?: boolean }) {
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
        <View style={[styles.centered, { paddingTop: skipSafeArea ? 24 : (isWeb ? 67 : insets.top) + 24 }]}>
          <MaterialCommunityIcons name="boxing-glove" size={48} color="#333" />
          <Text style={styles.emptyText}>Inicia sesión para ver tu modo luchador</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.centered, { paddingTop: skipSafeArea ? 24 : (isWeb ? 67 : insets.top) + 24 }]}>
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
            { paddingTop: skipSafeArea ? 24 : (isWeb ? 67 : insets.top) + 24, paddingBottom: 100 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
          }
        >
          <View style={styles.inactiveContainer}>
            <MaterialCommunityIcons name="sword-cross" size={64} color="#333" />
            <Text style={styles.inactiveSubtitle}>No Activado</Text>
            <View style={styles.divider} />
            <Text style={styles.inactiveDesc}>
              El modo luchador permite registrar tu historial de peleas y
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
          { paddingTop: skipSafeArea ? 8 : (isWeb ? 67 : insets.top) + 16, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
        }
      >
        {stats && <FightRecord stats={stats} />}

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
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 18,
    color: "#D4AF37",
    letterSpacing: 3,
  },
  sectionTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#555",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  fightCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderLeftWidth: 3,
    borderRadius: 2,
    padding: 10,
    marginBottom: 6,
  },
  fightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  resultText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  fightDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#444",
  },
  opponentName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 1,
  },
  fightMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#555",
    letterSpacing: 0.5,
  },
  eventName: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 4,
    fontStyle: "italic",
  },
  notes: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 3,
  },
  inactiveContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  inactiveTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 3,
    marginTop: 16,
  },
  inactiveSubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#444",
    letterSpacing: 3,
    marginTop: 4,
  },
  divider: {
    width: 30,
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 20,
  },
  inactiveDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555",
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
    fontSize: 12,
    color: "#444",
    marginTop: 12,
    textAlign: "center",
  },
});
