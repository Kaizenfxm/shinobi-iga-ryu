import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type UserData } from "@/lib/api";
import {
  FightsPanel,
  NotificationsPanel,
  EntrenamientoPanel,
  ClassesPanel,
  SuggestionsPanel,
} from "./admin";

type ProfesorTab = "peleas" | "notificaciones" | "entrenamiento" | "clases" | "sugerencias";

const TABS: { key: ProfesorTab; label: string; icon: string }[] = [
  { key: "peleas", label: "Peleas", icon: "boxing-glove" },
  { key: "notificaciones", label: "Notif.", icon: "bell-outline" },
  { key: "entrenamiento", label: "Entrena.", icon: "dumbbell" },
  { key: "clases", label: "Clases", icon: "qrcode" },
  { key: "sugerencias", label: "Sugerencias", icon: "chat-outline" },
];

export default function ProfesorScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfesorTab>("peleas");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionsReloadKey, setSuggestionsReloadKey] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.users);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los datos");
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
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
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as never}
              size={14}
              color={activeTab === tab.key ? "#000" : "#666"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
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
        {renderPanel()}
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
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
