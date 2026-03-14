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
  Image,
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

const DISCIPLINE_SUBTITLE: Record<string, string> = {
  ninjutsu: "El arte del ninja",
  jiujitsu: "El arte suave",
};

function BeltStrip({ color, name }: { color: string; name: string }) {
  const isBlack = color === "#000000";
  const isWhite = color === "#FFFFFF";
  const borderColor = isBlack ? "#2a2a2a" : isWhite ? "#555" : color;
  const labelColor = isWhite ? "#888" : color;

  return (
    <View style={beltStyles.wrapper}>
      <View style={[beltStyles.strip, { backgroundColor: color, borderColor }]}>
        <View style={beltStyles.knotZone}>
          <View style={[beltStyles.knotBar, { backgroundColor: borderColor }]} />
        </View>
        <View style={[beltStyles.stripe, { backgroundColor: borderColor, opacity: 0.25 }]} />
      </View>
      <Text style={[beltStyles.beltName, { color: labelColor }]}>{name.toUpperCase()}</Text>
    </View>
  );
}

const beltStyles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 10,
  },
  strip: {
    width: 200,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  knotZone: {
    position: "absolute",
    left: "42%",
    top: 0,
    bottom: 0,
    width: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  knotBar: {
    width: 3,
    height: "70%",
    borderRadius: 2,
  },
  stripe: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 16,
  },
  beltName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    letterSpacing: 4,
  },
});

function GoldRule() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "#1A1A1A" }} />
      <View style={{ width: 4, height: 4, backgroundColor: "#D4AF37", transform: [{ rotate: "45deg" }] }} />
      <View style={{ flex: 1, height: 1, backgroundColor: "#1A1A1A" }} />
    </View>
  );
}

function DisciplineCard({ belt }: { belt: MyBelt }) {
  const disciplineLabel = DISCIPLINE_LABELS[belt.discipline] || belt.discipline;
  const kanji = DISCIPLINE_KANJI[belt.discipline] || "";
  const subtitle = DISCIPLINE_SUBTITLE[belt.discipline] || "";
  const discIconName: "star-four-points" | "feather" =
    belt.discipline === "ninjutsu" ? "star-four-points" : "feather";

  return (
    <View style={styles.disciplineCard}>
      {/* Watermark kanji */}
      <Text style={styles.kanjiWatermark}>{kanji}</Text>

      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.disciplinePill}>
          <MaterialCommunityIcons name={discIconName} size={12} color="#D4AF37" />
          <Text style={styles.disciplinePillText}>{disciplineLabel}</Text>
        </View>
        <Text style={styles.cardKanji}>{kanji}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      <GoldRule />

      {/* Current belt */}
      <View style={styles.currentSection}>
        <Text style={styles.microLabel}>現在の帯 · CINTURÓN ACTUAL</Text>
        <View style={styles.beltStage}>
          <BeltStrip color={belt.currentBelt.color} name={belt.currentBelt.name} />
        </View>
        {belt.currentBelt.description && (
          <Text style={styles.beltDesc}>{belt.currentBelt.description}</Text>
        )}
      </View>

      {/* Next belt */}
      {belt.nextBelt && (
        <>
          <GoldRule />
          <View style={styles.nextSection}>
            <View style={styles.nextHeader}>
              <MaterialCommunityIcons
                name={belt.nextUnlocked ? "lock-open-variant" : "lock"}
                size={14}
                color={belt.nextUnlocked ? "#D4AF37" : "#333"}
              />
              <Text style={[styles.nextLabel, belt.nextUnlocked && styles.nextLabelUnlocked]}>
                {belt.nextUnlocked ? "次のレベル · DESBLOQUEADO" : "次のレベル · BLOQUEADO"}
              </Text>
            </View>

            {belt.nextUnlocked ? (
              <View style={styles.unlockedBlock}>
                <View style={styles.beltStage}>
                  <BeltStrip color={belt.nextBelt.color} name={belt.nextBelt.name} />
                </View>

                {belt.nextExam && (
                  <View style={styles.examCard}>
                    <Text style={styles.examLabel}>試験 · EXAMEN</Text>
                    <Text style={styles.examTitle}>{belt.nextExam.title}</Text>
                    {belt.nextExam.description && (
                      <Text style={styles.examDesc}>{belt.nextExam.description}</Text>
                    )}
                    <View style={styles.examMeta}>
                      {belt.nextExam.durationMinutes && (
                        <View style={styles.examMetaItem}>
                          <MaterialCommunityIcons name="clock-outline" size={13} color="#D4AF37" />
                          <Text style={styles.examMetaText}>{belt.nextExam.durationMinutes} min</Text>
                        </View>
                      )}
                      {belt.nextExam.passingScore && (
                        <View style={styles.examMetaItem}>
                          <MaterialCommunityIcons name="check-circle-outline" size={13} color="#D4AF37" />
                          <Text style={styles.examMetaText}>Aprobación: {belt.nextExam.passingScore}%</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {belt.nextRequirements.length > 0 && (
                  <View style={styles.reqList}>
                    <Text style={styles.microLabel}>要件 · REQUISITOS DEL EXAMEN</Text>
                    {belt.nextRequirements.map((req, i) => (
                      <View key={req.id} style={styles.reqItem}>
                        <View style={styles.reqNum}>
                          <Text style={styles.reqNumText}>{i + 1}</Text>
                        </View>
                        <View style={styles.reqContent}>
                          <Text style={styles.reqTitle}>{req.title}</Text>
                          {req.description && (
                            <Text style={styles.reqDesc}>{req.description}</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.lockedBlock}>
                <Text style={styles.lockedText}>
                  Tu sensei desbloqueará el acceso cuando estés listo
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {!belt.nextBelt && (
        <>
          <GoldRule />
          <View style={styles.maxBlock}>
            <MaterialCommunityIcons name="star-circle" size={18} color="#D4AF37" />
            <Text style={styles.maxText}>Grado máximo alcanzado</Text>
          </View>
        </>
      )}
    </View>
  );
}

function HistorySection({ history }: { history: BeltHistoryItem[] }) {
  if (history.length === 0) return null;

  return (
    <View style={styles.historySection}>
      <View style={styles.historySectionHeader}>
        <Text style={styles.historySectionKanji}>帯の歴史</Text>
        <Text style={styles.historySectionTitle}>HISTORIAL</Text>
      </View>

      <View style={styles.historyTimeline}>
        {history.map((item, idx) => {
          const date = new Date(item.achievedAt);
          const dateStr = date.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const disciplineLabel = DISCIPLINE_LABELS[item.discipline] || item.discipline;
          const histDiscIcon: "star-four-points" | "feather" =
            item.discipline === "ninjutsu" ? "star-four-points" : "feather";
          const dotColor =
            item.beltColor === "#FFFFFF" ? "#666"
            : item.beltColor === "#000000" ? "#2a2a2a"
            : item.beltColor;

          return (
            <View key={item.id} style={styles.historyRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { borderColor: dotColor, backgroundColor: dotColor + "33" }]} />
                {idx < history.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.historyContent}>
                <View style={styles.historyTop}>
                  <Text style={styles.historyBeltName}>{item.beltName}</Text>
                  <View style={styles.historyDisciplineBadge}>
                    <MaterialCommunityIcons name={histDiscIcon} size={10} color="#555" />
                    <Text style={styles.historyDisciplineText}>{disciplineLabel}</Text>
                  </View>
                </View>
                <Text style={styles.historyDate}>{dateStr}</Text>
                {item.notes && <Text style={styles.historyNotes}>{item.notes}</Text>}
              </View>
            </View>
          );
        })}
      </View>
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
    } catch {
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
        <ActivityIndicator color="#D4AF37" size="large" />
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogoRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerTitle}>CINTURONES</Text>
              <Text style={styles.headerKanji}>帯 · Progresión de grado</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {belts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyKanji}>帯</Text>
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

  /* Header */
  header: {
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  headerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerLogo: {
    width: 52,
    height: 52,
  },
  headerTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  headerKanji: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 11,
    color: "#555",
    letterSpacing: 2,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 8,
    marginVertical: 16,
  },

  /* Empty state */
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyKanji: {
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 72,
    color: "#1A1A1A",
  },
  emptyText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 15,
    color: "#555",
  },
  emptySubtext: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#333",
    fontStyle: "italic",
  },

  /* Discipline card */
  disciplineCard: {
    backgroundColor: "#060606",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#1C1C1C",
    padding: 24,
    marginBottom: 20,
    overflow: "hidden",
    position: "relative",
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
  },
  kanjiWatermark: {
    position: "absolute",
    right: -10,
    top: -16,
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 120,
    color: "#0F0F0F",
    pointerEvents: "none",
  },
  cardHeader: {
    gap: 4,
  },
  disciplinePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#2a2000",
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  disciplinePillText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  cardKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 42,
    color: "#FFFFFF",
    letterSpacing: -1,
    lineHeight: 48,
  },
  cardSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    letterSpacing: 1,
    fontStyle: "italic",
  },

  /* Belt sections */
  currentSection: {
    alignItems: "center",
    gap: 16,
  },
  microLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#444",
    letterSpacing: 3,
    textAlign: "center",
  },
  beltStage: {
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 2,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: "100%",
  },
  beltDesc: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 20,
  },

  /* Next belt */
  nextSection: {
    gap: 14,
  },
  nextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nextLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#333",
    letterSpacing: 2,
  },
  nextLabelUnlocked: {
    color: "#D4AF37",
  },
  unlockedBlock: {
    gap: 16,
  },
  lockedBlock: {
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 2,
    borderStyle: "dashed",
  },
  lockedText: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#333",
    textAlign: "center",
    fontStyle: "italic",
  },

  /* Exam */
  examCard: {
    backgroundColor: "#0A0800",
    borderWidth: 1,
    borderColor: "#1E1800",
    borderRadius: 2,
    borderLeftWidth: 2,
    borderLeftColor: "#D4AF37",
    padding: 14,
    gap: 6,
  },
  examLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#D4AF37",
    letterSpacing: 3,
  },
  examTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#D4AF37",
  },
  examDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#777",
    lineHeight: 18,
  },
  examMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
  },
  examMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  examMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#999",
  },

  /* Requirements */
  reqList: {
    gap: 10,
  },
  reqItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  reqNum: {
    width: 22,
    height: 22,
    borderRadius: 2,
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#2a2000",
    justifyContent: "center",
    alignItems: "center",
  },
  reqNumText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#D4AF37",
  },
  reqContent: {
    flex: 1,
    gap: 2,
  },
  reqTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#CCC",
    lineHeight: 18,
  },
  reqDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#555",
    lineHeight: 17,
  },

  /* Max belt */
  maxBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  maxText: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#D4AF37",
    fontStyle: "italic",
    letterSpacing: 1,
  },

  /* History */
  historySection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  historySectionHeader: {
    paddingHorizontal: 8,
    marginBottom: 20,
    gap: 2,
  },
  historySectionKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 24,
    color: "#1E1E1E",
    letterSpacing: 2,
  },
  historySectionTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#555",
    letterSpacing: 4,
  },
  historyTimeline: {
    paddingLeft: 8,
  },
  historyRow: {
    flexDirection: "row",
    gap: 14,
  },
  timelineLeft: {
    alignItems: "center",
    width: 14,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 2,
  },
  timelineLine: {
    flex: 1,
    width: 1,
    backgroundColor: "#111",
    marginVertical: 2,
    minHeight: 16,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 18,
    gap: 3,
  },
  historyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyBeltName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#DDD",
  },
  historyDisciplineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  historyDisciplineText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 1,
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#444",
  },
  historyNotes: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 18,
  },
});
