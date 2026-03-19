import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, Platform, ScrollView, RefreshControl, ActivityIndicator, Image, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BeltsScreen from "./belts";
import FightsScreen from "./fights";
import { classesApi, type MyAttendanceItem, type MyAttendanceStats } from "@/lib/api";

type SubTab = "cinturones" | "peleas" | "clases";

function ClasesTab() {
  const [data, setData] = useState<MyAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await classesApi.getMyAttendance();
      setData(res);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color="#D4AF37" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />}
      >
        {data && (
          <View style={clStyles.statsRow}>
            <View style={clStyles.statCard}>
              <Text style={clStyles.statNumber}>{data.totalClasses}</Text>
              <Text style={clStyles.statLabel}>TOTAL</Text>
            </View>
            <View style={clStyles.statCard}>
              <Text style={clStyles.statNumber}>{data.monthClasses}</Text>
              <Text style={clStyles.statLabel}>ESTE MES</Text>
            </View>
            <View style={clStyles.statCard}>
              <Text style={clStyles.statNumber}>{data.yearClasses}</Text>
              <Text style={clStyles.statLabel}>ESTE AÑO</Text>
            </View>
          </View>
        )}

        <Text style={clStyles.sectionTitle}>MI HISTORIAL ({data?.attendances.length || 0})</Text>
        {!data || data.attendances.length === 0 ? (
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
          data.attendances.map((att) => (
            <AttendanceCard key={att.id} att={att} />
          ))
        )}
      </ScrollView>

    </View>
  );
}

function AttendanceCard({ att }: { att: MyAttendanceItem }) {
  const [localRating, setLocalRating] = useState<number | null>(att.rating);
  const [submitting, setSubmitting] = useState(false);

  const canRate = (Date.now() - new Date(att.attendedAt).getTime()) < 24 * 60 * 60 * 1000;

  const handleRate = async (r: number) => {
    if (submitting || !canRate) return;
    setSubmitting(true);
    try {
      await classesApi.rate(att.classId, r);
      setLocalRating(r);
    } catch {
      Alert.alert("Error", "No se pudo enviar la calificación");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[clStyles.classCard, { flexDirection: "row", alignItems: "center" }]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <MaterialCommunityIcons name="check-circle" size={14} color="#D4AF37" />
          <Text style={clStyles.classTitle}>
            {att.systemNames.length > 0 ? att.systemNames.join(", ") : "Clase"}
          </Text>
        </View>
        <Text style={[clStyles.classDate, { marginTop: 3 }]}>
          {new Date(att.attendedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
          {" · "}
          {new Date(att.attendedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
        </Text>
        {att.createdByName && (
          <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 9, marginTop: 1 }}>
            Prof: {att.createdByName}
          </Text>
        )}
        {att.notes ? (
          <Text style={{ color: "#666", fontFamily: "NotoSansJP_400Regular", fontSize: 10, marginTop: 2, fontStyle: "italic" }}>
            {att.notes}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: "center", justifyContent: "center", paddingLeft: 10 }}>
        <View style={{ flexDirection: "row", gap: 2 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Pressable key={s} onPress={() => handleRate(s)} disabled={!canRate || submitting} style={{ padding: 1 }}>
              <MaterialCommunityIcons
                name={s <= (localRating ?? 0) ? "star" : "star-outline"}
                size={14}
                color={s <= (localRating ?? 0) ? "#D4AF37" : canRate ? "#444" : "#2a2a2a"}
              />
            </Pressable>
          ))}
        </View>
        {submitting && (
          <ActivityIndicator size="small" color="#D4AF37" style={{ marginTop: 2 }} />
        )}
      </View>
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
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: isWeb ? 16 : insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <Pressable onPress={() => router.push("/conocenos")}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Pressable>
        </View>
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
  headerContainer: {
    backgroundColor: "#000000",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  logoTitle: {
    color: "#FFF",
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 13,
    letterSpacing: 2,
  },
  logoSubtitle: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    letterSpacing: 1,
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
