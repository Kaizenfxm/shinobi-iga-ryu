import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { beltsApi, type MyBelt, type BeltHistoryItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const DISCIPLINE_LABELS: Record<string, string> = {
  ninjutsu: "NINJUTSU",
  jiujitsu: "JIUJITSU",
};

const DISCIPLINE_KANJI: Record<string, string> = {
  ninjutsu: "忍術",
  jiujitsu: "柔術",
};

function BeltVisual({ color, name, size = 60 }: { color: string; name: string; size?: number }) {
  const isBlack = color === "#000000";
  const isWhite = color === "#FFFFFF";
  const borderColor = isBlack ? "#333" : isWhite ? "#555" : color;

  return (
    <View style={[beltStyles.beltOuter, { width: size * 2.2, height: size * 0.7 }]}>
      <View
        style={[
          beltStyles.beltInner,
          {
            backgroundColor: color,
            borderColor,
            borderWidth: 1,
          },
        ]}
      >
        <View style={beltStyles.beltKnot}>
          <View style={[beltStyles.knotLine, { backgroundColor: borderColor }]} />
        </View>
      </View>
      <Text style={[beltStyles.beltLabel, isWhite ? { color: "#AAA" } : { color }]}>
        {name}
      </Text>
    </View>
  );
}

const beltStyles = StyleSheet.create({
  beltOuter: {
    alignItems: "center",
    justifyContent: "center",
  },
  beltInner: {
    width: "100%",
    height: "60%",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  beltKnot: {
    position: "absolute",
    right: "45%",
    top: "20%",
    bottom: "20%",
    width: 3,
  },
  knotLine: {
    flex: 1,
    width: 3,
    borderRadius: 1,
  },
  beltLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 6,
    textTransform: "uppercase",
  },
});

function DisciplineCard({ belt }: { belt: MyBelt }) {
  const disciplineLabel = DISCIPLINE_LABELS[belt.discipline] || belt.discipline;
  const kanji = DISCIPLINE_KANJI[belt.discipline] || "";
  const discIconName: "star-four-points" | "feather" =
    belt.discipline === "ninjutsu" ? "star-four-points" : "feather";

  return (
    <View style={styles.disciplineCard}>
      <View style={styles.disciplineHeader}>
        <MaterialCommunityIcons name={discIconName} size={18} color="#D4AF37" style={{ marginRight: 6 }} />
        <Text style={styles.disciplineKanji}>{kanji}</Text>
        <Text style={styles.disciplineTitle}>{disciplineLabel}</Text>
      </View>

      <View style={styles.currentBeltSection}>
        <Text style={styles.sectionLabel}>CINTURÓN ACTUAL</Text>
        <View style={styles.beltDisplay}>
          <BeltVisual color={belt.currentBelt.color} name={belt.currentBelt.name} size={70} />
        </View>
        {belt.currentBelt.description && (
          <Text style={styles.beltDescription}>{belt.currentBelt.description}</Text>
        )}
      </View>

      {belt.nextBelt && (
        <View style={styles.nextBeltSection}>
          <View style={styles.nextBeltHeader}>
            <MaterialCommunityIcons
              name={belt.nextUnlocked ? "lock-open-variant" : "lock"}
              size={16}
              color={belt.nextUnlocked ? "#D4AF37" : "#444"}
            />
            <Text
              style={[
                styles.nextBeltTitle,
                belt.nextUnlocked && styles.nextBeltTitleUnlocked,
              ]}
            >
              {belt.nextUnlocked ? "SIGUIENTE NIVEL DESBLOQUEADO" : "SIGUIENTE NIVEL BLOQUEADO"}
            </Text>
          </View>

          {belt.nextUnlocked ? (
            <View style={styles.unlockedContent}>
              <View style={styles.nextBeltPreview}>
                <BeltVisual color={belt.nextBelt.color} name={belt.nextBelt.name} size={50} />
              </View>

              {belt.nextExam && (
                <View style={styles.examSection}>
                  <Text style={styles.examTitle}>{belt.nextExam.title}</Text>
                  {belt.nextExam.description && (
                    <Text style={styles.examDesc}>{belt.nextExam.description}</Text>
                  )}
                  <View style={styles.examMeta}>
                    {belt.nextExam.durationMinutes && (
                      <View style={styles.examMetaItem}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#D4AF37" />
                        <Text style={styles.examMetaText}>{belt.nextExam.durationMinutes} min</Text>
                      </View>
                    )}
                    {belt.nextExam.passingScore && (
                      <View style={styles.examMetaItem}>
                        <MaterialCommunityIcons name="check-circle-outline" size={14} color="#D4AF37" />
                        <Text style={styles.examMetaText}>Aprobación: {belt.nextExam.passingScore}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {belt.nextRequirements.length > 0 && (
                <View style={styles.requirementsList}>
                  <Text style={styles.requirementsTitle}>REQUISITOS DEL EXAMEN</Text>
                  {belt.nextRequirements.map((req, i) => (
                    <View key={req.id} style={styles.requirementItem}>
                      <View style={styles.requirementNumber}>
                        <Text style={styles.requirementNumberText}>{i + 1}</Text>
                      </View>
                      <View style={styles.requirementContent}>
                        <Text style={styles.requirementTitle}>{req.title}</Text>
                        {req.description && (
                          <Text style={styles.requirementDesc}>{req.description}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.lockedContent}>
              <Text style={styles.lockedText}>
                Tu sensei desbloqueará el acceso cuando estés listo
              </Text>
            </View>
          )}
        </View>
      )}

      {!belt.nextBelt && (
        <View style={styles.maxBeltSection}>
          <MaterialCommunityIcons name="star" size={20} color="#D4AF37" />
          <Text style={styles.maxBeltText}>Has alcanzado el grado máximo</Text>
        </View>
      )}
    </View>
  );
}

function HistorySection({ history }: { history: BeltHistoryItem[] }) {
  if (history.length === 0) return null;

  return (
    <View style={styles.historySection}>
      <Text style={styles.historySectionTitle}>HISTORIAL DE CINTURONES</Text>
      <Text style={styles.historySectionKanji}>帯の歴史</Text>

      {history.map((item) => {
        const date = new Date(item.achievedAt);
        const dateStr = date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const disciplineLabel = DISCIPLINE_LABELS[item.discipline] || item.discipline;
        const histDiscIcon: "star-four-points" | "feather" =
          item.discipline === "ninjutsu" ? "star-four-points" : "feather";

        return (
          <View key={item.id} style={styles.historyItem}>
            <View style={[styles.historyDot, { backgroundColor: item.beltColor === "#FFFFFF" ? "#555" : item.beltColor === "#000000" ? "#333" : item.beltColor }]} />
            <View style={styles.historyContent}>
              <View style={styles.historyRow}>
                <Text style={styles.historyBeltName}>{item.beltName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <MaterialCommunityIcons name={histDiscIcon} size={12} color="#888" />
                  <Text style={styles.historyDiscipline}>{disciplineLabel}</Text>
                </View>
              </View>
              <Text style={styles.historyDate}>{dateStr}</Text>
              {item.notes && <Text style={styles.historyNotes}>{item.notes}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function BeltsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [belts, setBelts] = useState<MyBelt[]>([]);
  const [history, setHistory] = useState<BeltHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, authLoading]);

  const fetchBelts = useCallback(async () => {
    try {
      const data = await beltsApi.getMyBelts();
      setBelts(data.belts);
      setHistory(data.history);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar los cinturones");
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBelts().finally(() => setLoading(false));
    }
  }, [fetchBelts, isAuthenticated]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBelts();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#FFFFFF" size="large" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="medal" size={26} color="#D4AF37" />
          <View>
            <Text style={styles.headerTitle}>Cinturones</Text>
            <Text style={styles.headerKanji}>帯 · Progresión</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {belts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="medal" size={48} color="#333" />
            <Text style={styles.emptyText}>Aún no tienes cinturones asignados</Text>
            <Text style={styles.emptySubtext}>Tu sensei te asignará tus disciplinas</Text>
          </View>
        ) : (
          belts.map((belt) => (
            <DisciplineCard key={belt.discipline} belt={belt} />
          ))
        )}

        <HistorySection history={history} />
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
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  headerKanji: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    letterSpacing: 2,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 15,
    color: "#666",
  },
  emptySubtext: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#444",
  },
  disciplineCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 20,
    marginBottom: 16,
  },
  disciplineHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  disciplineKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 22,
    color: "#D4AF37",
  },
  disciplineTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  currentBeltSection: {
    alignItems: "center",
    paddingVertical: 16,
  },
  sectionLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#555",
    letterSpacing: 3,
    marginBottom: 16,
  },
  beltDisplay: {
    alignItems: "center",
    marginBottom: 12,
  },
  beltDescription: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    fontStyle: "italic",
  },
  nextBeltSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 16,
  },
  nextBeltHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  nextBeltTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#444",
    letterSpacing: 2,
  },
  nextBeltTitleUnlocked: {
    color: "#D4AF37",
  },
  unlockedContent: {
    gap: 16,
  },
  nextBeltPreview: {
    alignItems: "center",
    paddingVertical: 8,
  },
  requirementsList: {
    gap: 12,
  },
  requirementsTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#555",
    letterSpacing: 3,
    marginBottom: 4,
  },
  requirementItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  requirementNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
    alignItems: "center",
  },
  requirementNumberText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
  },
  requirementContent: {
    flex: 1,
    gap: 2,
  },
  requirementTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#DDD",
  },
  requirementDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#666",
  },
  examSection: {
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#332A00",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  examTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#D4AF37",
    marginBottom: 4,
  },
  examDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  examMeta: {
    flexDirection: "row",
    gap: 16,
  },
  examMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  examMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#D4AF37",
  },
  lockedContent: {
    paddingVertical: 16,
    alignItems: "center",
  },
  lockedText: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    fontStyle: "italic",
  },
  maxBeltSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  maxBeltText: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 14,
    color: "#D4AF37",
    fontStyle: "italic",
  },
  historySection: {
    marginTop: 8,
    paddingTop: 16,
  },
  historySectionTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 3,
    paddingHorizontal: 8,
  },
  historySectionKanji: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    letterSpacing: 2,
    paddingHorizontal: 8,
    marginTop: 2,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0F0F0F",
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyBeltName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#DDD",
  },
  historyDiscipline: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#555",
    letterSpacing: 2,
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#555",
  },
  historyNotes: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
