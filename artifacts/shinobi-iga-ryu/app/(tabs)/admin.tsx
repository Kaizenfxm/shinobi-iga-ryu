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
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, beltsApi, type UserData, type AdminBeltUser, type BeltHistoryItem } from "@/lib/api";

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

const DISCIPLINE_LABELS: Record<string, string> = {
  ninjutsu: "Ninjutsu",
  jiujitsu: "Jiujitsu",
};

type AdminTab = "usuarios" | "cinturones";

function UsersPanel({
  users,
  currentUser,
  expandedUser,
  setExpandedUser,
  setUsers,
}: {
  users: UserData[];
  currentUser: UserData | null;
  expandedUser: number | null;
  setExpandedUser: (id: number | null) => void;
  setUsers: React.Dispatch<React.SetStateAction<UserData[]>>;
}) {
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

  return (
    <>
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
    </>
  );
}

function BeltsPanel({
  beltUsers,
  onRefresh,
}: {
  beltUsers: AdminBeltUser[];
  onRefresh: () => Promise<void>;
}) {
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userHistory, setUserHistory] = useState<Record<number, BeltHistoryItem[]>>({});
  const [historyLoading, setHistoryLoading] = useState<number | null>(null);

  const filteredUsers = beltUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const loadHistory = async (userId: number) => {
    if (userHistory[userId]) return;
    setHistoryLoading(userId);
    try {
      const data = await beltsApi.adminGetHistory(userId);
      setUserHistory((prev) => ({ ...prev, [userId]: data.history }));
    } catch {
      // silent
    } finally {
      setHistoryLoading(null);
    }
  };

  const handleExpand = (userId: number) => {
    const isExpanded = expandedUser === userId;
    setExpandedUser(isExpanded ? null : userId);
    if (!isExpanded) {
      loadHistory(userId);
    }
  };

  const handleUnlock = async (userId: number, discipline: string) => {
    const key = `unlock-${userId}-${discipline}`;
    setActionLoading(key);
    try {
      const result = await beltsApi.adminUnlock(userId, discipline);
      await onRefresh();
      setActionLoading(null);
      Alert.alert(
        "Nivel Desbloqueado",
        `Se desbloqueó el acceso al cinturón ${result.nextBelt.name}`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al desbloquear";
      setActionLoading(null);
      Alert.alert("Error", msg);
    }
  };

  const handlePromote = async (userId: number, discipline: string, userName: string) => {
    Alert.alert(
      "Confirmar Promoción",
      `¿Promover a ${userName} al siguiente cinturón de ${DISCIPLINE_LABELS[discipline] || discipline}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Promover",
          onPress: async () => {
            const key = `promote-${userId}-${discipline}`;
            setActionLoading(key);
            try {
              const result = await beltsApi.adminPromote(userId, discipline);
              Alert.alert(
                "Promoción Exitosa",
                `${userName} ahora tiene cinturón ${result.newBelt.name}`
              );
              setUserHistory((prev) => {
                const copy = { ...prev };
                delete copy[userId];
                return copy;
              });
              await onRefresh();
              loadHistory(userId);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Error al promover";
              Alert.alert("Error", msg);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color="#555" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alumno..."
          placeholderTextColor="#444"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={16} color="#555" />
          </Pressable>
        )}
      </View>

      {filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="karate" size={48} color="#333" />
          <Text style={styles.emptyText}>
            {searchQuery ? "Sin resultados" : "No hay alumnos con cinturones"}
          </Text>
        </View>
      ) : (
        filteredUsers.map((u) => {
          const isExpanded = expandedUser === u.id;
          const history = userHistory[u.id] || [];

          return (
            <Pressable
              key={u.id}
              style={styles.userCard}
              onPress={() => handleExpand(u.id)}
            >
              <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                  <Ionicons name="person" size={20} color="#666" />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.displayName}</Text>
                  <Text style={styles.userEmail}>{u.email}</Text>
                  <View style={styles.roleBadges}>
                    {u.belts.map((b) => (
                      <View key={b.discipline} style={styles.beltMiniCard}>
                        <View
                          style={[
                            styles.beltDot,
                            {
                              backgroundColor:
                                b.currentBelt.color === "#FFFFFF"
                                  ? "#AAA"
                                  : b.currentBelt.color === "#000000"
                                  ? "#333"
                                  : b.currentBelt.color,
                            },
                          ]}
                        />
                        <Text style={styles.beltMiniText}>
                          {b.currentBelt.name} · {DISCIPLINE_LABELS[b.discipline] || b.discipline}
                        </Text>
                        {b.nextUnlocked && (
                          <MaterialCommunityIcons
                            name="lock-open-variant"
                            size={10}
                            color="#D4AF37"
                          />
                        )}
                      </View>
                    ))}
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

                  {u.belts.length === 0 && (
                    <View style={styles.noBeltsContainer}>
                      <Text style={styles.noBeltsText}>Sin cinturones asignados</Text>
                      <Pressable
                        style={styles.beltActionButton}
                        onPress={async () => {
                          try {
                            setActionLoading(`init-${u.id}`);
                            await beltsApi.adminInitialize(u.id);
                            Alert.alert("Éxito", "Cinturones iniciales asignados");
                            onRefresh();
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : "Error al asignar cinturones";
                            Alert.alert("Error", msg);
                          } finally {
                            setActionLoading(null);
                          }
                        }}
                        disabled={actionLoading === `init-${u.id}`}
                      >
                        {actionLoading === `init-${u.id}` ? (
                          <ActivityIndicator size="small" color="#D4AF37" />
                        ) : (
                          <>
                            <MaterialCommunityIcons name="plus-circle" size={14} color="#D4AF37" />
                            <Text style={styles.beltActionText}>Asignar Cinturones</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  )}

                  {u.belts.map((b) => {
                    const unlockKey = `unlock-${u.id}-${b.discipline}`;
                    const promoteKey = `promote-${u.id}-${b.discipline}`;

                    return (
                      <View key={b.discipline} style={styles.beltManageSection}>
                        <Text style={styles.sectionLabel}>
                          {(DISCIPLINE_LABELS[b.discipline] || b.discipline).toUpperCase()}
                        </Text>
                        <View style={styles.beltManageRow}>
                          <View
                            style={[
                              styles.beltColorBar,
                              {
                                backgroundColor:
                                  b.currentBelt.color === "#FFFFFF"
                                    ? "#AAA"
                                    : b.currentBelt.color === "#000000"
                                    ? "#333"
                                    : b.currentBelt.color,
                              },
                            ]}
                          />
                          <View style={styles.beltManageInfo}>
                            <Text style={styles.beltManageName}>
                              Cinturón {b.currentBelt.name}
                            </Text>
                            <Text style={styles.beltManageStatus}>
                              {b.nextUnlocked
                                ? "Siguiente nivel desbloqueado"
                                : "Siguiente nivel bloqueado"}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.beltActions}>
                          {!b.nextUnlocked && (
                            <Pressable
                              style={styles.beltActionButton}
                              onPress={() => handleUnlock(u.id, b.discipline)}
                              disabled={actionLoading === unlockKey}
                            >
                              {actionLoading === unlockKey ? (
                                <ActivityIndicator size="small" color="#D4AF37" />
                              ) : (
                                <>
                                  <MaterialCommunityIcons
                                    name="lock-open-variant"
                                    size={14}
                                    color="#D4AF37"
                                  />
                                  <Text style={styles.beltActionText}>Desbloquear</Text>
                                </>
                              )}
                            </Pressable>
                          )}
                          {b.nextUnlocked && (
                            <Pressable
                              style={[styles.beltActionButton, styles.beltPromoteButton]}
                              onPress={() =>
                                handlePromote(u.id, b.discipline, u.displayName)
                              }
                              disabled={actionLoading === promoteKey}
                            >
                              {actionLoading === promoteKey ? (
                                <ActivityIndicator size="small" color="#000" />
                              ) : (
                                <>
                                  <MaterialCommunityIcons
                                    name="arrow-up-bold"
                                    size={14}
                                    color="#000"
                                  />
                                  <Text style={styles.beltPromoteText}>Promover</Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.sectionDivider} />
                  <Text style={styles.sectionLabel}>HISTORIAL</Text>
                  {historyLoading === u.id ? (
                    <ActivityIndicator size="small" color="#555" style={{ marginVertical: 8 }} />
                  ) : history.length > 0 ? (
                    history.map((h) => {
                      const date = new Date(h.achievedAt);
                      const dateStr = date.toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <View key={h.id} style={styles.historyItem}>
                          <View
                            style={[
                              styles.historyDot,
                              {
                                backgroundColor:
                                  h.beltColor === "#FFFFFF"
                                    ? "#555"
                                    : h.beltColor === "#000000"
                                    ? "#333"
                                    : h.beltColor,
                              },
                            ]}
                          />
                          <View style={styles.historyContent}>
                            <Text style={styles.historyBeltName}>
                              {h.beltName} · {DISCIPLINE_LABELS[h.discipline] || h.discipline}
                            </Text>
                            <Text style={styles.historyDate}>{dateStr}</Text>
                            {h.notes && (
                              <Text style={styles.historyNotes}>{h.notes}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noHistoryText}>Sin historial</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("usuarios");
  const [users, setUsers] = useState<UserData[]>([]);
  const [beltUsers, setBeltUsers] = useState<AdminBeltUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, beltsRes] = await Promise.all([
        adminApi.getUsers(),
        beltsApi.adminGetUsers(),
      ]);
      setUsers(usersRes.users);
      setBeltUsers(beltsRes.users);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar los datos");
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const refreshBelts = async () => {
    try {
      const beltsRes = await beltsApi.adminGetUsers();
      setBeltUsers(beltsRes.users);
    } catch {
      // silent
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
        </View>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabButton, activeTab === "usuarios" && styles.tabButtonActive]}
            onPress={() => setActiveTab("usuarios")}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === "usuarios" ? "#000" : "#666"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "usuarios" && styles.tabButtonTextActive,
              ]}
            >
              Usuarios ({users.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "cinturones" && styles.tabButtonActive]}
            onPress={() => setActiveTab("cinturones")}
          >
            <MaterialCommunityIcons
              name="karate"
              size={16}
              color={activeTab === "cinturones" ? "#000" : "#666"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "cinturones" && styles.tabButtonTextActive,
              ]}
            >
              Cinturones
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {activeTab === "usuarios" ? (
          <UsersPanel
            users={users}
            currentUser={currentUser}
            expandedUser={expandedUser}
            setExpandedUser={setExpandedUser}
            setUsers={setUsers}
          />
        ) : (
          <BeltsPanel beltUsers={beltUsers} onRefresh={refreshBelts} />
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
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 15,
    color: "#666",
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
  beltMiniCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  beltDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  beltMiniText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#AAA",
  },
  beltManageSection: {
    marginBottom: 16,
  },
  beltManageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  beltColorBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  beltManageInfo: {
    flex: 1,
    gap: 2,
  },
  beltManageName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#DDD",
  },
  beltManageStatus: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
  },
  beltActions: {
    flexDirection: "row",
    gap: 8,
  },
  beltActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A1500",
    borderWidth: 1,
    borderColor: "#332A00",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  beltActionText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#D4AF37",
  },
  beltPromoteButton: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  beltPromoteText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#FFFFFF",
    padding: 0,
  },
  historyItem: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  historyContent: {
    flex: 1,
    gap: 1,
  },
  historyBeltName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#CCC",
  },
  historyDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#555",
  },
  historyNotes: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#666",
  },
  noHistoryText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#444",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  noBeltsContainer: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  noBeltsText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#555",
    fontStyle: "italic",
  },
});
