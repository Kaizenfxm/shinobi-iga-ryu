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
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type UserData } from "@/lib/api";

const ROLES = ["admin", "profesor", "alumno"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  profesor: "Profesor",
  alumno: "Alumno",
};
const ROLE_ICONS: Record<string, string> = {
  admin: "shield-crown",
  profesor: "school",
  alumno: "account",
};

const SUB_LEVELS = ["basico", "medio", "avanzado", "personalizado"] as const;
const SUB_LABELS: Record<string, string> = {
  basico: "Básico",
  medio: "Medio",
  avanzado: "Avanzado",
  personalizado: "Personalizado",
};

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { users: data } = await adminApi.getUsers();
      setUsers(data);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar los usuarios");
    }
  }, []);

  useEffect(() => {
    fetchUsers().finally(() => setLoading(false));
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const toggleRole = async (userId: number, role: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const hasRole = user.roles.includes(role);
    let newRoles: string[];

    if (hasRole) {
      newRoles = user.roles.filter((r) => r !== role);
      if (newRoles.length === 0) {
        Alert.alert("Error", "El usuario debe tener al menos un rol");
        return;
      }
    } else {
      newRoles = [...user.roles, role];
    }

    try {
      await adminApi.updateRoles(userId, newRoles);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: newRoles } : u))
      );
    } catch {
      Alert.alert("Error", "No se pudo actualizar el rol");
    }
  };

  const changeSubscription = async (userId: number, level: string) => {
    try {
      await adminApi.updateSubscription(userId, level);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, subscriptionLevel: level } : u
        )
      );
    } catch {
      Alert.alert("Error", "No se pudo cambiar la suscripción");
    }
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
          <MaterialCommunityIcons name="shield-crown" size={24} color="#D4AF37" />
          <Text style={styles.headerTitle}>Panel de Admin</Text>
          <Text style={styles.headerCount}>{users.length} usuarios</Text>
        </View>

        <View style={styles.divider} />

        {users.map((u) => {
          const isExpanded = expandedUser === u.id;
          const isCurrentUser = u.id === currentUser?.id;

          return (
            <Pressable
              key={u.id}
              style={styles.userCard}
              onPress={() => setExpandedUser(isExpanded ? null : u.id)}
            >
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={20} color="#666" />
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName}>{u.displayName}</Text>
                    {isCurrentUser && <Text style={styles.youBadge}>Tú</Text>}
                  </View>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.roleBadges}>
                    {u.roles.map((r) => (
                      <View key={r} style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                          {ROLE_LABELS[r] || r}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.subBadge}>
                      <Text style={styles.subBadgeText}>
                        {SUB_LABELS[u.subscriptionLevel] || u.subscriptionLevel}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#555"
                />
              </View>

              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.sectionDivider} />

                  <Text style={styles.sectionLabel}>ROLES</Text>
                  <View style={styles.toggleGroup}>
                    {ROLES.map((role) => {
                      const hasRole = u.roles.includes(role);
                      return (
                        <Pressable
                          key={role}
                          style={[
                            styles.toggleButton,
                            hasRole && styles.toggleButtonActive,
                          ]}
                          onPress={() => toggleRole(u.id, role)}
                        >
                          <MaterialCommunityIcons
                            name={ROLE_ICONS[role] as keyof typeof MaterialCommunityIcons.glyphMap}
                            size={16}
                            color={hasRole ? "#000" : "#666"}
                          />
                          <Text
                            style={[
                              styles.toggleText,
                              hasRole && styles.toggleTextActive,
                            ]}
                          >
                            {ROLE_LABELS[role]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.sectionLabel}>SUSCRIPCIÓN</Text>
                  <View style={styles.toggleGroup}>
                    {SUB_LEVELS.map((level) => {
                      const isActive = u.subscriptionLevel === level;
                      return (
                        <Pressable
                          key={level}
                          style={[
                            styles.toggleButton,
                            isActive && styles.toggleButtonGold,
                          ]}
                          onPress={() => changeSubscription(u.id, level)}
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              isActive && styles.toggleTextActive,
                            ]}
                          >
                            {SUB_LABELS[level]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
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
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666",
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 16,
  },
  userCard: {
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    padding: 16,
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  youBadge: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#D4AF37",
    backgroundColor: "#1A1500",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555",
  },
  roleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#AAA",
    letterSpacing: 1,
  },
  subBadge: {
    backgroundColor: "#1A1500",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  expandedContent: {
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 12,
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
    marginBottom: 16,
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
  toggleButtonGold: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  toggleText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888",
  },
  toggleTextActive: {
    color: "#000",
  },
});
