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
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { profesorApi, type UserData } from "@/lib/api";

const SUB_LABELS: Record<string, string> = {
  basico: "Básico",
  medio: "Medio",
  avanzado: "Avanzado",
  personalizado: "Personalizado",
};

export default function AlumnosScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [students, setStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          <MaterialCommunityIcons name="school" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Mis Alumnos</Text>
          <Text style={styles.headerCount}>{students.length}</Text>
        </View>

        <View style={styles.divider} />

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
                <Text style={styles.studentName}>{s.displayName}</Text>
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
});
