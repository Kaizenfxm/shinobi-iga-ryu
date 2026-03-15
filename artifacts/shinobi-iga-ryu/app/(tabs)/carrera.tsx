import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BeltsScreen from "./belts";
import FightsScreen from "./fights";
import { classesApi, type ClassData, type ClassStats } from "@/lib/api";

type SubTab = "cinturones" | "peleas" | "clases";

function ClasesTab() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [classesRes, statsRes] = await Promise.all([
        classesApi.getAll(),
        classesApi.getMyStats(),
      ]);
      setClasses(classesRes.classes);
      setStats(statsRes);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const attendedClasses = classes.filter((c) => c.myAttendance !== null);
  const upcomingClasses = classes.filter((c) => c.status === "programada" || c.status === "en_curso");

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
    >
      {stats && (
        <View style={clStyles.statsRow}>
          <View style={clStyles.statCard}>
            <Text style={clStyles.statNumber}>{stats.totalClasses}</Text>
            <Text style={clStyles.statLabel}>TOTAL</Text>
          </View>
          <View style={clStyles.statCard}>
            <Text style={clStyles.statNumber}>{stats.monthClasses}</Text>
            <Text style={clStyles.statLabel}>ESTE MES</Text>
          </View>
        </View>
      )}

      {upcomingClasses.length > 0 && (
        <>
          <Text style={clStyles.sectionTitle}>PRÓXIMAS CLASES</Text>
          {upcomingClasses.map((cls) => (
            <ClassCard key={cls.id} cls={cls} />
          ))}
        </>
      )}

      <Text style={clStyles.sectionTitle}>MI HISTORIAL ({attendedClasses.length})</Text>
      {attendedClasses.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 30 }}>
          <MaterialCommunityIcons name="calendar-blank" size={32} color="#333" />
          <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 12, marginTop: 8 }}>
            Aún no has asistido a ninguna clase
          </Text>
          <Text style={{ color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 10, marginTop: 4, textAlign: "center" }}>
            Escanea el código QR en tu próxima clase
          </Text>
        </View>
      ) : (
        attendedClasses.map((cls) => (
          <ClassCard key={cls.id} cls={cls} showAttendance />
        ))
      )}
    </ScrollView>
  );
}

function ClassCard({ cls, showAttendance }: { cls: ClassData; showAttendance?: boolean }) {
  const statusColors: Record<string, string> = {
    programada: "#D4AF37",
    en_curso: "#1a8f1a",
    finalizada: "#666",
    cancelada: "#8f1a1a",
  };
  const statusLabels: Record<string, string> = {
    programada: "Programada",
    en_curso: "En Curso",
    finalizada: "Finalizada",
    cancelada: "Cancelada",
  };

  return (
    <View style={clStyles.classCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={clStyles.classTitle}>{cls.title}</Text>
        <View style={{ backgroundColor: (statusColors[cls.status] || "#666") + "30", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 }}>
          <Text style={{ color: statusColors[cls.status] || "#666", fontFamily: "NotoSansJP_500Medium", fontSize: 8 }}>
            {statusLabels[cls.status] || cls.status}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
        <Text style={clStyles.classDate}>
          {cls.classDate} · {cls.startTime?.slice(0, 5)}{cls.endTime ? `-${cls.endTime.slice(0, 5)}` : ""}
        </Text>
        <Text style={{ color: "#D4AF37", fontFamily: "NotoSansJP_500Medium", fontSize: 9, textTransform: "uppercase" }}>
          {cls.sede === "bogota" ? "Bogotá" : "Chía"}
        </Text>
      </View>
      {cls.profesorName && (
        <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 9, marginTop: 1 }}>
          Prof: {cls.profesorName}
        </Text>
      )}
      {showAttendance && cls.myAttendance && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          <MaterialCommunityIcons name="check-circle" size={12} color="#D4AF37" />
          <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 9 }}>
            Asistencia: {new Date(cls.myAttendance.checkedInAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {cls.myAttendance.rating && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <MaterialCommunityIcons
                  key={s}
                  name={s <= (cls.myAttendance?.rating ?? 0) ? "star" : "star-outline"}
                  size={10}
                  color={s <= (cls.myAttendance?.rating ?? 0) ? "#D4AF37" : "#333"}
                />
              ))}
            </View>
          )}
        </View>
      )}
      {cls.trainingSystems.length > 0 && (
        <View style={{ flexDirection: "row", gap: 4, marginTop: 3 }}>
          {cls.trainingSystems.map((ts) => (
            <View key={ts.id} style={{ backgroundColor: "#1a1a1a", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 }}>
              <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 8 }}>{ts.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const clStyles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 2,
    borderTopWidth: 1,
    borderTopColor: "#D4AF3722",
    padding: 12,
    alignItems: "center",
  },
  statNumber: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 24,
  },
  statLabel: {
    color: "#666",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  sectionTitle: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 4,
  },
  classCard: {
    backgroundColor: "#070707",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 2,
    borderTopWidth: 1,
    borderTopColor: "#D4AF3722",
    padding: 10,
    marginBottom: 6,
  },
  classTitle: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
  },
  classDate: {
    color: "#888",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
  },
});

export default function CarreraScreen() {
  const [activeTab, setActiveTab] = useState<SubTab>("cinturones");
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.root}>
      <View style={[styles.subTabContainer, { paddingTop: isWeb ? 67 : insets.top }]}>
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTab, activeTab === "cinturones" && styles.subTabActive]}
            onPress={() => setActiveTab("cinturones")}
          >
            <MaterialCommunityIcons
              name="medal"
              size={15}
              color={activeTab === "cinturones" ? "#D4AF37" : "#555"}
            />
            <Text style={[styles.subTabText, activeTab === "cinturones" && styles.subTabTextActive]}>
              CINTURONES
            </Text>
          </Pressable>

          <View style={styles.subTabSep} />

          <Pressable
            style={[styles.subTab, activeTab === "peleas" && styles.subTabActive]}
            onPress={() => setActiveTab("peleas")}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={15}
              color={activeTab === "peleas" ? "#D4AF37" : "#555"}
            />
            <Text style={[styles.subTabText, activeTab === "peleas" && styles.subTabTextActive]}>
              PELEAS
            </Text>
          </Pressable>

          <View style={styles.subTabSep} />

          <Pressable
            style={[styles.subTab, activeTab === "clases" && styles.subTabActive]}
            onPress={() => setActiveTab("clases")}
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={15}
              color={activeTab === "clases" ? "#D4AF37" : "#555"}
            />
            <Text style={[styles.subTabText, activeTab === "clases" && styles.subTabTextActive]}>
              CLASES
            </Text>
          </Pressable>
        </View>

        <View style={styles.subTabUnderline} />
      </View>

      <View style={styles.content}>
        {activeTab === "cinturones" ? (
          <BeltsScreen skipSafeArea />
        ) : activeTab === "peleas" ? (
          <FightsScreen skipSafeArea />
        ) : (
          <ClasesTab />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  subTabContainer: {
    backgroundColor: "#000000",
  },
  subTabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 32,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
  },
  subTabActive: {},
  subTabSep: {
    width: 1,
    height: 18,
    backgroundColor: "#1A1A1A",
  },
  subTabText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#555",
    letterSpacing: 2,
  },
  subTabTextActive: {
    color: "#D4AF37",
  },
  subTabUnderline: {
    height: 1,
    backgroundColor: "#1A1A1A",
  },
  content: {
    flex: 1,
  },
});
