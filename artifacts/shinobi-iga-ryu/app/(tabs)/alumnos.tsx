import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  profesorApi,
  fightsApi,
  type UserData,
  type FightData,
  type FightStats,
  type AddFightData,
} from "@/lib/api";

const SUB_LABELS: Record<string, string> = {
  basico: "Básico",
  medio: "Medio",
  avanzado: "Avanzado",
  personalizado: "Personalizado",
};

const FIGHT_RESULT_LABELS: Record<string, string> = {
  victoria: "Victoria",
  derrota: "Derrota",
  empate: "Empate",
};

const FIGHT_DISCIPLINE_OPTIONS = [
  { value: "mma", label: "MMA" },
  { value: "box", label: "Box" },
  { value: "jiujitsu", label: "Jiujitsu" },
  { value: "muay_thai", label: "Muay Thai" },
  { value: "ninjutsu", label: "Ninjutsu" },
  { value: "otro", label: "Otro" },
];

const FIGHT_METHOD_OPTIONS = [
  { value: "", label: "Sin especificar" },
  { value: "ko", label: "KO" },
  { value: "tko", label: "TKO" },
  { value: "sumision", label: "Sumisión" },
  { value: "decision", label: "Decisión" },
  { value: "decision_unanime", label: "Dec. Unánime" },
  { value: "decision_dividida", label: "Dec. Dividida" },
  { value: "descalificacion", label: "Descalificación" },
  { value: "no_contest", label: "Sin Resultado" },
];

type ProfesorTab = "alumnos" | "peleas";

export default function AlumnosScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfesorTab>("alumnos");

  const [selectedFighterId, setSelectedFighterId] = useState<number | null>(null);
  const [fights, setFights] = useState<FightData[]>([]);
  const [stats, setStats] = useState<FightStats | null>(null);
  const [loadingFights, setLoadingFights] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formOpponent, setFormOpponent] = useState("");
  const [formEvent, setFormEvent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formResult, setFormResult] = useState("victoria");
  const [formMethod, setFormMethod] = useState("");
  const [formDiscipline, setFormDiscipline] = useState("mma");
  const [formRounds, setFormRounds] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fighters = students.filter((s) => s.isFighter);

  const fetchStudents = useCallback(async () => {
    try {
      const { students: data } = await profesorApi.getAlumnos();
      setStudents(data);
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    fetchStudents().finally(() => setLoading(false));
  }, [fetchStudents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    setRefreshing(false);
  };

  const loadFights = async (userId: number) => {
    setLoadingFights(true);
    try {
      const data = await fightsApi.getUserFights(userId);
      setFights(data.fights);
      setStats(data.stats);
    } catch {
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoadingFights(false);
    }
  };

  const resetForm = () => {
    setFormOpponent("");
    setFormEvent("");
    setFormDate("");
    setFormResult("victoria");
    setFormMethod("");
    setFormDiscipline("mma");
    setFormRounds("");
    setFormNotes("");
    setShowForm(false);
  };

  const handleAddFight = async () => {
    if (!selectedFighterId || !formOpponent.trim() || !formDate.trim()) {
      Alert.alert("Error", "Se requiere oponente y fecha");
      return;
    }
    setActionLoading("add-fight");
    try {
      const data: AddFightData = {
        userId: selectedFighterId,
        opponentName: formOpponent.trim(),
        fightDate: formDate.trim(),
        result: formResult,
        discipline: formDiscipline,
      };
      if (formEvent.trim()) data.eventName = formEvent.trim();
      if (formMethod) data.method = formMethod;
      if (formRounds.trim()) data.rounds = parseInt(formRounds, 10);
      if (formNotes.trim()) data.notes = formNotes.trim();

      await fightsApi.addFight(data);
      resetForm();
      await loadFights(selectedFighterId);
      Alert.alert("Éxito", "Pelea registrada");
    } catch {
      Alert.alert("Error", "No se pudo registrar la pelea");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteFight = async (fightId: number) => {
    Alert.alert("Confirmar", "¿Eliminar esta pelea del registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setActionLoading(`del-${fightId}`);
          try {
            await fightsApi.deleteFight(fightId);
            if (selectedFighterId) await loadFights(selectedFighterId);
          } catch {
            Alert.alert("Error", "No se pudo eliminar la pelea");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
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
          { paddingTop: (isWeb ? 67 : insets.top) + 16, paddingBottom: isWeb ? 100 : insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="school" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Mis Alumnos</Text>
          <Text style={styles.headerCount}>{students.length}</Text>
        </View>

        {fighters.length > 0 && (
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabButton, activeTab === "alumnos" && styles.tabButtonActive]}
              onPress={() => setActiveTab("alumnos")}
            >
              <Ionicons
                name="people"
                size={16}
                color={activeTab === "alumnos" ? "#000" : "#666"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "alumnos" && styles.tabButtonTextActive,
                ]}
              >
                Alumnos
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabButton, activeTab === "peleas" && styles.tabButtonActive]}
              onPress={() => setActiveTab("peleas")}
            >
              <MaterialCommunityIcons
                name="sword-cross"
                size={16}
                color={activeTab === "peleas" ? "#000" : "#666"}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === "peleas" && styles.tabButtonTextActive,
                ]}
              >
                Peleas
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.divider} />

        {activeTab === "alumnos" ? (
          <>
            {students.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#333" />
                <Text style={styles.emptyText}>No hay alumnos registrados</Text>
              </View>
            ) : (
              students.map((s) => (
                <View key={s.id} style={styles.studentCard}>
                  <View style={styles.studentAvatar}>
                    <Ionicons name="person" size={20} color="#666" />
                  </View>
                  <View style={styles.studentInfo}>
                    <View style={styles.studentNameRow}>
                      <Text style={styles.studentName}>{s.displayName}</Text>
                      {s.isFighter && (
                        <MaterialCommunityIcons name="sword-cross" size={14} color="#D4AF37" />
                      )}
                    </View>
                    <Text style={styles.studentEmail}>{s.email}</Text>
                  </View>
                  <View style={styles.subBadge}>
                    <Text style={styles.subBadgeText}>
                      {SUB_LABELS[s.subscriptionLevel] || s.subscriptionLevel}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>LUCHADORES</Text>
            {fighters.length === 0 ? (
              <Text style={styles.noFightersText}>
                No hay luchadores entre tus alumnos
              </Text>
            ) : (
              <>
                <View style={styles.toggleGroup}>
                  {fighters.map((f) => (
                    <Pressable
                      key={f.id}
                      style={[
                        styles.toggleButton,
                        selectedFighterId === f.id && styles.toggleButtonActive,
                      ]}
                      onPress={() => {
                        setSelectedFighterId(f.id);
                        loadFights(f.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.toggleText,
                          selectedFighterId === f.id && styles.toggleTextActive,
                        ]}
                      >
                        {f.displayName}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {selectedFighterId && loadingFights && (
                  <ActivityIndicator color="#D4AF37" style={{ marginVertical: 20 }} />
                )}

                {selectedFighterId && !loadingFights && stats && (
                  <>
                    <View style={styles.fighterStatsRow}>
                      <View style={styles.fighterStatBox}>
                        <Text style={[styles.fighterStatNum, { color: "#22C55E" }]}>{stats.victorias}</Text>
                        <Text style={styles.fighterStatLabel}>V</Text>
                      </View>
                      <View style={styles.fighterStatBox}>
                        <Text style={[styles.fighterStatNum, { color: "#EF4444" }]}>{stats.derrotas}</Text>
                        <Text style={styles.fighterStatLabel}>D</Text>
                      </View>
                      <View style={styles.fighterStatBox}>
                        <Text style={[styles.fighterStatNum, { color: "#F59E0B" }]}>{stats.empates}</Text>
                        <Text style={styles.fighterStatLabel}>E</Text>
                      </View>
                    </View>

                    <Pressable
                      style={styles.addFightButton}
                      onPress={() => setShowForm(!showForm)}
                    >
                      <MaterialCommunityIcons
                        name={showForm ? "close" : "plus-circle"}
                        size={14}
                        color="#D4AF37"
                      />
                      <Text style={styles.addFightButtonText}>
                        {showForm ? "Cancelar" : "Registrar Pelea"}
                      </Text>
                    </Pressable>

                    {showForm && (
                      <View style={styles.fightFormContainer}>
                        <TextInput
                          style={styles.fightFormInput}
                          placeholder="Nombre del oponente *"
                          placeholderTextColor="#555"
                          value={formOpponent}
                          onChangeText={setFormOpponent}
                        />
                        <TextInput
                          style={styles.fightFormInput}
                          placeholder="Nombre del evento"
                          placeholderTextColor="#555"
                          value={formEvent}
                          onChangeText={setFormEvent}
                        />
                        <TextInput
                          style={styles.fightFormInput}
                          placeholder="Fecha (YYYY-MM-DD) *"
                          placeholderTextColor="#555"
                          value={formDate}
                          onChangeText={setFormDate}
                        />
                        <Text style={styles.fightFormLabel}>Resultado</Text>
                        <View style={styles.toggleGroup}>
                          {(["victoria", "derrota", "empate"] as const).map((r) => (
                            <Pressable
                              key={r}
                              style={[
                                styles.toggleButton,
                                formResult === r && styles.toggleButtonActive,
                              ]}
                              onPress={() => setFormResult(r)}
                            >
                              <Text
                                style={[
                                  styles.toggleText,
                                  formResult === r && styles.toggleTextActive,
                                ]}
                              >
                                {FIGHT_RESULT_LABELS[r]}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={styles.fightFormLabel}>Disciplina</Text>
                        <View style={styles.toggleGroup}>
                          {FIGHT_DISCIPLINE_OPTIONS.map((d) => (
                            <Pressable
                              key={d.value}
                              style={[
                                styles.toggleButton,
                                formDiscipline === d.value && styles.toggleButtonActive,
                              ]}
                              onPress={() => setFormDiscipline(d.value)}
                            >
                              <Text
                                style={[
                                  styles.toggleText,
                                  formDiscipline === d.value && styles.toggleTextActive,
                                ]}
                              >
                                {d.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <Text style={styles.fightFormLabel}>Método</Text>
                        <View style={styles.toggleGroup}>
                          {FIGHT_METHOD_OPTIONS.map((m) => (
                            <Pressable
                              key={m.value}
                              style={[
                                styles.toggleButton,
                                formMethod === m.value && styles.toggleButtonActive,
                              ]}
                              onPress={() => setFormMethod(m.value)}
                            >
                              <Text
                                style={[
                                  styles.toggleText,
                                  formMethod === m.value && styles.toggleTextActive,
                                ]}
                              >
                                {m.label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <TextInput
                          style={styles.fightFormInput}
                          placeholder="Rounds"
                          placeholderTextColor="#555"
                          value={formRounds}
                          onChangeText={setFormRounds}
                          keyboardType="numeric"
                        />
                        <TextInput
                          style={[styles.fightFormInput, { height: 60 }]}
                          placeholder="Notas"
                          placeholderTextColor="#555"
                          value={formNotes}
                          onChangeText={setFormNotes}
                          multiline
                        />
                        <Pressable
                          style={styles.submitButton}
                          onPress={handleAddFight}
                          disabled={actionLoading === "add-fight"}
                        >
                          {actionLoading === "add-fight" ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.submitButtonText}>Registrar Pelea</Text>
                          )}
                        </Pressable>
                      </View>
                    )}

                    <View style={styles.sectionDivider} />
                    {fights.length === 0 ? (
                      <Text style={styles.noFightersText}>Sin peleas registradas</Text>
                    ) : (
                      fights.map((fight) => {
                        const resultColor =
                          fight.result === "victoria" ? "#22C55E" :
                          fight.result === "derrota" ? "#EF4444" : "#F59E0B";
                        const dateStr = new Date(fight.fightDate).toLocaleDateString("es-MX", {
                          year: "numeric", month: "short", day: "numeric",
                        });
                        return (
                          <View key={fight.id} style={styles.fightCard}>
                            <View style={styles.fightCardHeader}>
                              <View style={[styles.fightResultDot, { backgroundColor: resultColor }]} />
                              <Text style={styles.fightCardResult}>
                                {FIGHT_RESULT_LABELS[fight.result]} vs {fight.opponentName}
                              </Text>
                              <Pressable
                                onPress={() => handleDeleteFight(fight.id)}
                                disabled={actionLoading === `del-${fight.id}`}
                              >
                                {actionLoading === `del-${fight.id}` ? (
                                  <ActivityIndicator size="small" color="#FF4444" />
                                ) : (
                                  <Ionicons name="trash-outline" size={16} color="#555" />
                                )}
                              </Pressable>
                            </View>
                            <Text style={styles.fightCardDate}>
                              {dateStr} · {FIGHT_DISCIPLINE_OPTIONS.find((d) => d.value === fight.discipline)?.label || fight.discipline}
                              {fight.method ? ` · ${FIGHT_METHOD_OPTIONS.find((m) => m.value === fight.method)?.label || fight.method}` : ""}
                            </Text>
                            {fight.eventName && (
                              <Text style={styles.fightCardEvent}>{fight.eventName}</Text>
                            )}
                          </View>
                        );
                      })
                    )}
                  </>
                )}
              </>
            )}
          </>
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
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    letterSpacing: 2,
    flex: 1,
  },
  headerCount: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#666",
    backgroundColor: "#111",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  tabButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888",
  },
  tabButtonTextActive: {
    color: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 16,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#444",
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  studentName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  studentEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555",
  },
  subBadge: {
    backgroundColor: "#1A1500",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  sectionLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#555",
    letterSpacing: 3,
    marginBottom: 8,
  },
  toggleGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  toggleText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888",
  },
  toggleTextActive: {
    color: "#000",
  },
  noFightersText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  fighterStatsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginVertical: 16,
  },
  fighterStatBox: {
    alignItems: "center",
  },
  fighterStatNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  fighterStatLabel: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  addFightButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A1500",
    borderWidth: 1,
    borderColor: "#332A00",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  addFightButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#D4AF37",
  },
  fightFormContainer: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  fightFormInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#FFFFFF",
  },
  fightFormLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#888",
    letterSpacing: 2,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#000",
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 12,
  },
  fightCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fightCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  fightResultDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fightCardResult: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#DDD",
    flex: 1,
  },
  fightCardDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#555",
  },
  fightCardEvent: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
});
