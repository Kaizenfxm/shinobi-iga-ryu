import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { adminApi, suggestionsApi, type UserData } from "@/lib/api";
import {
  FightsPanel,
  NotificationsPanel,
  EntrenamientoPanel,
  ClassesPanel,
  SuggestionsPanel,
  CalificacionesPanel,
} from "./admin";

type ProfesorTab = "peleas" | "notificaciones" | "entrenamiento" | "clases" | "calificaciones" | "sugerencias";

export default function ProfesorScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<ProfesorTab>("peleas");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [suggestionsReloadKey, setSuggestionsReloadKey] = useState(0);
  const [unreviewedCount, setUnreviewedCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.users);
      setFetchError(null);
    } catch {
      console.error("[ProfesorScreen] Failed to fetch users");
      setFetchError("No se pudieron cargar los datos. Tira hacia abajo para reintentar.");
    }
  }, []);

  const fetchUnreviewed = useCallback(async () => {
    try {
      const { count } = await suggestionsApi.adminUnreviewedCount();
      setUnreviewedCount(count);
    } catch {}
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
    fetchUnreviewed();
    const interval = setInterval(fetchUnreviewed, 30_000);
    return () => clearInterval(interval);
  }, [fetchData, fetchUnreviewed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    await fetchUnreviewed();
    setSuggestionsReloadKey((k) => k + 1);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  const renderPanel = () => {
    switch (activeTab) {
      case "peleas":
        return <FightsPanel users={users} onRefreshUsers={fetchData} />;
      case "notificaciones":
        return <NotificationsPanel />;
      case "entrenamiento":
        return <EntrenamientoPanel />;
      case "clases":
        return <ClassesPanel users={users} />;
      case "calificaciones":
        return <CalificacionesPanel />;
      case "sugerencias":
        return (
          <SuggestionsPanel
            reloadKey={suggestionsReloadKey}
            onCountChange={() => {}}
            readOnly
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: isWeb ? 67 : insets.top + 16 }]}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={{ width: 36, height: 36 }}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>PANEL PROFESOR</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabButton, activeTab === "peleas" && styles.tabButtonActive]}
          onPress={() => setActiveTab("peleas")}
        >
          <MaterialCommunityIcons
            name="sword-cross"
            size={20}
            color={activeTab === "peleas" ? "#000" : "#666"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "notificaciones" && styles.tabButtonActive]}
          onPress={() => setActiveTab("notificaciones")}
        >
          <Ionicons
            name="notifications"
            size={20}
            color={activeTab === "notificaciones" ? "#000" : "#666"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "entrenamiento" && styles.tabButtonActive]}
          onPress={() => setActiveTab("entrenamiento")}
        >
          <MaterialCommunityIcons
            name="dumbbell"
            size={20}
            color={activeTab === "entrenamiento" ? "#000" : "#666"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "clases" && styles.tabButtonActive]}
          onPress={() => setActiveTab("clases")}
        >
          <MaterialCommunityIcons
            name="calendar-clock"
            size={20}
            color={activeTab === "clases" ? "#000" : "#666"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "calificaciones" && styles.tabButtonActive]}
          onPress={() => setActiveTab("calificaciones")}
        >
          <MaterialCommunityIcons
            name="star"
            size={20}
            color={activeTab === "calificaciones" ? "#000" : "#666"}
          />
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "sugerencias" && styles.tabButtonActive]}
          onPress={() => setActiveTab("sugerencias")}
        >
          <View style={{ position: "relative" }}>
            <Ionicons
              name="chatbubble"
              size={20}
              color={activeTab === "sugerencias" ? "#000" : "#666"}
            />
            {unreviewedCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreviewedCount}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isWeb ? 100 : insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFF" />
        }
      >
        {fetchError ? (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => {
                setFetchError(null);
                fetchData();
              }}
            >
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          renderPanel()
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
  tabBar: {
    flexDirection: "row",
    gap: 4,
    marginTop: 16,
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  tabBadge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "NotoSansJP_700Bold",
    lineHeight: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A0000",
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
  },
  errorText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#FF3B30",
    flex: 1,
  },
  retryBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  retryBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#FFF",
  },
});
