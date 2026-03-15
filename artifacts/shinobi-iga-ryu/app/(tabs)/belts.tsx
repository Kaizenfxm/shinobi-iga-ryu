import React, { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  beltsApi,
  type MyBelt,
  type BeltHistoryItem,
  type LadderBelt,
  type LadderBeltRequirement,
} from "@/lib/api";
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

function getStripeCount(name: string): number {
  const match = name.match(/(\d+)\s+franja/i);
  return match ? parseInt(match[1], 10) : 0;
}

function BeltColorStrip({ color, name = "", size = 40 }: { color: string; name?: string; size?: number }) {
  const stripes = getStripeCount(name);
  const nameLower = name.toLowerCase();
  const isPuntaNegra = nameLower.includes("punta negra");
  const isFranjaRoja = nameLower.includes("franja roja");
  const colorLower = color.toLowerCase();
  const isVeryDark = colorLower === "#000000" || colorLower === "#1c1c1c" || colorLower === "#212121";
  const isWhite = colorLower === "#ffffff";
  const borderColor = isVeryDark ? "#3a3a3a" : isWhite ? "#bbb" : color;
  const stripeColor = isVeryDark ? "#D4AF37" : "#000000";
  const height = Math.round(size * 0.45);

  const showKnot = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja;
  const showEnd = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja;

  const stripePositions = stripes > 0
    ? Array.from({ length: stripes }, (_, i) => {
        const zoneStart = Math.round(size * 0.56);
        const zoneWidth = Math.round(size * 0.36);
        const step = zoneWidth / stripes;
        return Math.round(zoneStart + step * i + step * 0.35);
      })
    : [];

  return (
    <View
      style={[
        beltStripStyles.strip,
        {
          width: size,
          height,
          backgroundColor: color,
          borderColor,
        },
      ]}
    >
      {showKnot && (
        <View style={[beltStripStyles.knot, { backgroundColor: borderColor }]} />
      )}
      {showEnd && (
        <View style={[beltStripStyles.end, { backgroundColor: borderColor + "40" }]} />
      )}
      {isFranjaRoja && (
        <View style={beltStripStyles.franjaRoja} />
      )}
      {isPuntaNegra && (
        <View style={beltStripStyles.puntaNegra} />
      )}
      {stripePositions.map((leftPx, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: leftPx,
            top: Math.round(height * 0.12),
            bottom: Math.round(height * 0.12),
            width: 2,
            backgroundColor: stripeColor,
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

const beltStripStyles = StyleSheet.create({
  strip: {
    borderRadius: 2,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  knot: {
    position: "absolute",
    left: "44%",
    top: "15%",
    bottom: "15%",
    width: 2,
    borderRadius: 1,
  },
  end: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "20%",
  },
  franjaRoja: {
    position: "absolute",
    left: "38%",
    width: "20%",
    top: 0,
    bottom: 0,
    backgroundColor: "#CC0000",
  },
  puntaNegra: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "30%",
    backgroundColor: "#000000",
  },
});

function GoldRule() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 14 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: "#1A1A1A" }} />
      <View style={{ width: 4, height: 4, backgroundColor: "#D4AF37", transform: [{ rotate: "45deg" }] }} />
      <View style={{ flex: 1, height: 1, backgroundColor: "#1A1A1A" }} />
    </View>
  );
}

function RequirementsChecklist({
  requirements,
  onToggle,
  toggling,
  readOnly = false,
}: {
  requirements: LadderBeltRequirement[];
  onToggle: (id: number) => void;
  toggling: Set<number>;
  readOnly?: boolean;
}) {
  if (requirements.length === 0) {
    return (
      <Text style={reqStyles.empty}>Sin requisitos para este cinturón</Text>
    );
  }

  return (
    <View style={reqStyles.list}>
      <Text style={reqStyles.header}>{readOnly ? "要件 · REQUISITOS" : "要件 · REQUISITOS A DOMINAR"}</Text>
      {requirements.map((req, idx) => (
        <Pressable
          key={req.id}
          style={[reqStyles.row, req.checked && reqStyles.rowChecked, readOnly && reqStyles.rowReadOnly]}
          onPress={readOnly ? undefined : () => onToggle(req.id)}
        >
          <View style={reqStyles.left}>
            <View style={[reqStyles.numBadge, req.checked && reqStyles.numBadgeChecked]}>
              {!readOnly && toggling.has(req.id) ? (
                <ActivityIndicator size={10} color="#D4AF37" />
              ) : req.checked ? (
                <MaterialCommunityIcons name="check" size={12} color="#D4AF37" />
              ) : (
                <Text style={reqStyles.numText}>{idx + 1}</Text>
              )}
            </View>
          </View>
          <View style={reqStyles.content}>
            <Text style={[reqStyles.title, req.checked && reqStyles.titleChecked]}>
              {req.title}
            </Text>
            {req.description && (
              <Text style={reqStyles.desc}>{req.description}</Text>
            )}
          </View>
          {!readOnly && (
            <MaterialCommunityIcons
              name={req.checked ? "checkbox-marked" : "checkbox-blank-outline"}
              size={20}
              color={req.checked ? "#D4AF37" : "#333"}
            />
          )}
        </Pressable>
      ))}
      {!readOnly && (
        <View style={reqStyles.progress}>
          <Text style={reqStyles.progressText}>
            {requirements.filter((r) => r.checked).length}/{requirements.length} dominados
          </Text>
          <View style={reqStyles.progressBar}>
            <View
              style={[
                reqStyles.progressFill,
                {
                  width: `${(requirements.filter((r) => r.checked).length / requirements.length) * 100}%` as `${number}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const reqStyles = StyleSheet.create({
  list: { gap: 0 },
  header: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#444",
    letterSpacing: 3,
    marginBottom: 10,
    marginTop: 4,
  },
  empty: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#444",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0D0D0D",
    backgroundColor: "#080808",
    borderRadius: 2,
    marginBottom: 4,
  },
  rowChecked: {
    backgroundColor: "#0A0800",
  },
  rowReadOnly: {
    opacity: 0.85,
  },
  left: {
    width: 24,
    alignItems: "center",
  },
  numBadge: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#1E1E1E",
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  numBadgeChecked: {
    borderColor: "#2a2000",
    backgroundColor: "#0D0A00",
  },
  numText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#555",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#AAA",
    lineHeight: 18,
  },
  titleChecked: {
    color: "#D4AF37",
  },
  desc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  progress: {
    marginTop: 8,
    gap: 6,
  },
  progressText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#555",
    letterSpacing: 2,
    textAlign: "right",
  },
  progressBar: {
    height: 2,
    backgroundColor: "#1A1A1A",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 1,
  },
});

type BeltStatus = "earned" | "current" | "available" | "applied" | "locked";

function LadderRow({
  belt,
  onApply,
  onToggleReq,
  applying,
  togglingReqs,
}: {
  belt: LadderBelt;
  onApply: () => void;
  onToggleReq: (id: number) => void;
  applying: boolean;
  togglingReqs: Set<number>;
}) {
  const status = belt.status as BeltStatus;
  const [reqsOpen, setReqsOpen] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    AsyncStorage.getItem(`belt_reqs_open_${belt.id}`).then((val) => {
      if (val === "1") setReqsOpen(true);
    });
  }, [belt.id]);

  const toggleReqs = () => {
    const next = !reqsOpen;
    setReqsOpen(next);
    AsyncStorage.setItem(`belt_reqs_open_${belt.id}`, next ? "1" : "0");
  };

  const showInfo = status === "current" || status === "available" || status === "applied";
  const hasReqs = belt.requirements.length > 0;
  const showReqsToggle = (status === "applied" || status === "earned" || status === "current") && hasReqs;
  const reqsReadOnly = status === "earned" || status === "current";

  const borderColor = (() => {
    if (status === "current") return "#D4AF37";
    if (status === "available") return "#8B7225";
    if (status === "applied") return "#D4AF37";
    return "#111";
  })();

  const rowOpacity = status === "locked" ? 0.4 : status === "earned" ? 0.7 : 1;

  return (
    <View style={[rowStyles.container, { borderColor, opacity: rowOpacity }]}>
      <View style={rowStyles.header}>
        <BeltColorStrip color={belt.color} name={belt.name} size={56} />

        {status === "available" && (
          <Pressable
            style={[rowStyles.applyBtn, applying && rowStyles.applyBtnLoading]}
            onPress={onApply}
            disabled={applying}
          >
            {applying ? (
              <ActivityIndicator size={12} color="#000" />
            ) : (
              <>
                <MaterialCommunityIcons name="send" size={12} color="#000" />
                <Text style={rowStyles.applyBtnText}>POSTULARME</Text>
              </>
            )}
          </Pressable>
        )}

        <View style={rowStyles.nameArea}>
          <Text style={[rowStyles.name, status === "current" && rowStyles.nameCurrent]}>
            {belt.name.toUpperCase()}
          </Text>
          {showInfo && belt.description && (
            <Text style={rowStyles.desc} numberOfLines={2}>{belt.description}</Text>
          )}
        </View>

        {status === "earned" && (
          <View style={rowStyles.badgeEarned}>
            <MaterialCommunityIcons name="check-circle" size={12} color="#4a9" />
            <Text style={rowStyles.badgeEarnedText}>APROBADO</Text>
          </View>
        )}
        {status === "current" && (
          <View style={rowStyles.badgeCurrent}>
            <Text style={rowStyles.badgeCurrentText}>ACTUAL</Text>
          </View>
        )}
        {status === "applied" && (
          <View style={rowStyles.badgeApplied}>
            <MaterialCommunityIcons name="clock-outline" size={11} color="#D4AF37" />
            <Text style={rowStyles.badgeAppliedText}>POSTULADO</Text>
          </View>
        )}
        {status === "locked" && (
          <MaterialCommunityIcons name="lock" size={16} color="#333" />
        )}
      </View>

      {showReqsToggle && (
        <>
          <Pressable style={rowStyles.reqsToggle} onPress={toggleReqs}>
            <Text style={rowStyles.reqsToggleText}>
              {reqsReadOnly ? "VER REQUISITOS" : "REQUISITOS"}
            </Text>
            <MaterialCommunityIcons
              name={reqsOpen ? "chevron-up" : "chevron-down"}
              size={14}
              color="#555"
            />
          </Pressable>
          {reqsOpen && (
            <View style={rowStyles.expandedContent}>
              <RequirementsChecklist
                requirements={belt.requirements}
                onToggle={onToggleReq}
                toggling={togglingReqs}
                readOnly={reqsReadOnly}
              />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: "#060606",
    borderWidth: 1,
    borderRadius: 2,
    marginBottom: 6,
    padding: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameArea: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#888",
    letterSpacing: 2,
  },
  nameCurrent: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  desc: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 11,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 16,
  },
  badgeEarned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#001a0f",
    borderWidth: 1,
    borderColor: "#0d3320",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeEarnedText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 8,
    color: "#4a9",
    letterSpacing: 1,
  },
  badgeCurrent: {
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeCurrentText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  applyBtnLoading: {
    opacity: 0.7,
  },
  applyBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#000",
    letterSpacing: 1,
  },
  badgeApplied: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#3a2800",
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeAppliedText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 8,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  expandedContent: {
    marginTop: 4,
  },
  reqsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  reqsToggleText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#555",
    letterSpacing: 2,
  },
});

function DisciplineSection({
  belt,
  onApply,
  onToggleReq,
  applyingDiscs,
  togglingReqs,
}: {
  belt: MyBelt;
  onApply: (discipline: string) => void;
  onToggleReq: (discipline: string, reqId: number) => void;
  applyingDiscs: Set<string>;
  togglingReqs: Set<number>;
}) {
  const kanji = DISCIPLINE_KANJI[belt.discipline] || "";
  const label = DISCIPLINE_LABELS[belt.discipline] || belt.discipline;
  const subtitle = DISCIPLINE_SUBTITLE[belt.discipline] || "";
  const discIcon: "star-four-points" | "feather" =
    belt.discipline === "ninjutsu" ? "star-four-points" : "feather";
  const storageKey = `disc_section_open_${belt.discipline}`;

  const [open, setOpen] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    AsyncStorage.getItem(storageKey).then((val) => {
      if (val === "0") setOpen(false);
    });
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    AsyncStorage.setItem(storageKey, next ? "1" : "0");
  };

  const earned = belt.ladder.filter((b) => b.status === "earned").length;
  const total = belt.ladder.length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionKanjiWatermark}>{kanji}</Text>

      <Pressable style={styles.sectionHeader} onPress={toggle}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionPill}>
            <MaterialCommunityIcons name={discIcon} size={11} color="#D4AF37" />
            <Text style={styles.sectionPillText}>{label}</Text>
          </View>
          <Text style={styles.sectionKanji}>{kanji}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color="#555"
        />
      </Pressable>

      <View style={styles.progressSummary}>
        <Text style={styles.progressLabel}>{earned}/{total} cinturones aprobados</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(earned / total) * 100}%` as `${number}%` }]} />
        </View>
      </View>

      {open && (
        <>
          <GoldRule />
          <View style={styles.ladder}>
            {belt.ladder.map((b) => (
              <LadderRow
                key={b.id}
                belt={b}
                onApply={() => onApply(belt.discipline)}
                onToggleReq={(reqId) => onToggleReq(belt.discipline, reqId)}
                applying={applyingDiscs.has(belt.discipline)}
                togglingReqs={togglingReqs}
              />
            ))}
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

export default function BeltsScreen({ skipSafeArea = false }: { skipSafeArea?: boolean }) {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [belts, setBelts] = useState<MyBelt[]>([]);
  const [history, setHistory] = useState<BeltHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applyingDiscs, setApplyingDiscs] = useState<Set<string>>(new Set());
  const [togglingReqs, setTogglingReqs] = useState<Set<number>>(new Set());

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

  const handleApply = async (discipline: string) => {
    setApplyingDiscs((s) => new Set(s).add(discipline));
    try {
      await beltsApi.apply(discipline);
      await fetchBelts();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo enviar la postulación");
    } finally {
      setApplyingDiscs((s) => {
        const ns = new Set(s);
        ns.delete(discipline);
        return ns;
      });
    }
  };

  const handleToggleReq = async (_discipline: string, reqId: number) => {
    setTogglingReqs((s) => new Set(s).add(reqId));
    try {
      const result = await beltsApi.toggleRequirementCheck(reqId);
      setBelts((prev) =>
        prev.map((b) => ({
          ...b,
          ladder: b.ladder.map((l) => ({
            ...l,
            requirements: l.requirements.map((r) =>
              r.id === reqId ? { ...r, checked: result.checked } : r
            ),
          })),
        }))
      );
    } catch {
      Alert.alert("Error", "No se pudo actualizar el requisito");
    } finally {
      setTogglingReqs((s) => {
        const ns = new Set(s);
        ns.delete(reqId);
        return ns;
      });
    }
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
          { paddingTop: skipSafeArea ? 8 : (isWeb ? 67 : insets.top) + 16, paddingBottom: 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLogoRow}>
            <Pressable onPress={() => router.push("/conocenos" as never)}>
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </Pressable>
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
            <Text style={styles.emptyText}>Cargando disciplinas...</Text>
            <Text style={styles.emptySubtext}>Por favor espera</Text>
          </View>
        ) : (
          belts.map((belt) => (
            belt.ladder.length > 0 ? (
              <DisciplineSection
                key={belt.discipline}
                belt={belt}
                onApply={handleApply}
                onToggleReq={handleToggleReq}
                applyingDiscs={applyingDiscs}
                togglingReqs={togglingReqs}
              />
            ) : null
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

  section: {
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#1C1C1C",
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
    borderRadius: 2,
    padding: 20,
    backgroundColor: "#060606",
    overflow: "hidden",
    position: "relative",
  },
  sectionKanjiWatermark: {
    position: "absolute",
    right: -10,
    top: -20,
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 120,
    color: "#0D0D0D",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  sectionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#2a2000",
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  sectionPillText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  sectionKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 42,
    color: "#FFFFFF",
    lineHeight: 48,
  },
  sectionSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    letterSpacing: 1,
    fontStyle: "italic",
  },

  progressSummary: {
    gap: 6,
  },
  progressLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#555",
    letterSpacing: 2,
    textAlign: "right",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "#1A1A1A",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 1,
  },

  ladder: {
    gap: 0,
  },

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
