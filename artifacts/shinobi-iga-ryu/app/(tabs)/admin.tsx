import React, { useEffect, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Modal,
  KeyboardAvoidingView,
  Switch,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { adminApi, beltsApi, fightsApi, notificationsApi, getAvatarServingUrl, type UserData, type FightData, type FightStats, type AddFightData, type CatalogDiscipline, type CatalogBelt, type CatalogRequirement, type AdminBeltUser, type PendingBeltApplication, type NotificationData } from "@/lib/api";

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

type AdminTab = "usuarios" | "cinturones" | "peleas" | "notificaciones";

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

const SEDES_OPTIONS = [
  { value: "bogota", label: "Bogotá" },
  { value: "chia", label: "Chía" },
];

const NOTIFICATION_TARGETS = [
  { value: "todas", label: "Todos" },
  { value: "bogota", label: "Bogotá" },
  { value: "chia", label: "Chía" },
  { value: "peleadores", label: "Peleadores" },
];

const INIT_USER_FORM = {
  displayName: "",
  email: "",
  password: "",
  phone: "",
  roles: ["alumno"] as string[],
  subscriptionLevel: "basico",
  isFighter: false,
  sedes: [] as string[],
};

function UserFormModal({
  visible,
  mode,
  initialData,
  onClose,
  onSaved,
}: {
  visible: boolean;
  mode: "create" | "edit";
  initialData?: UserData | null;
  onClose: () => void;
  onSaved: (user: UserData & { roles: string[] }) => void;
}) {
  const [form, setForm] = useState(INIT_USER_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (mode === "edit" && initialData) {
        setForm({
          displayName: initialData.displayName,
          email: initialData.email,
          password: "",
          phone: initialData.phone || "",
          roles: initialData.roles || ["alumno"],
          subscriptionLevel: initialData.subscriptionLevel,
          isFighter: initialData.isFighter,
          sedes: initialData.sedes || [],
        });
      } else {
        setForm(INIT_USER_FORM);
      }
    }
  }, [visible, mode, initialData]);

  const toggleRole = (role: string) => {
    setForm((prev) => {
      const has = prev.roles.includes(role);
      if (has && prev.roles.length === 1) return prev;
      return { ...prev, roles: has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role] };
    });
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }
    if (!form.email.trim()) {
      Alert.alert("Error", "El email es obligatorio");
      return;
    }
    if (mode === "create" && !form.password) {
      Alert.alert("Error", "La contraseña es obligatoria");
      return;
    }
    if (form.password && form.password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await adminApi.createUser({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim(),
          phone: form.phone.trim() || undefined,
          roles: form.roles,
          subscriptionLevel: form.subscriptionLevel,
          isFighter: form.isFighter,
          sedes: form.sedes,
        });
        onSaved({ ...res.user, roles: form.roles });
      } else if (initialData) {
        const payload: Parameters<typeof adminApi.updateUser>[1] = {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          isFighter: form.isFighter,
          sedes: form.sedes,
        };
        if (form.password) payload.password = form.password;
        const res = await adminApi.updateUser(initialData.id, payload);
        if (form.roles.join(",") !== (initialData.roles || []).join(",")) {
          await adminApi.updateRoles(initialData.id, form.roles);
        }
        if (form.subscriptionLevel !== initialData.subscriptionLevel) {
          await adminApi.updateSubscription(initialData.id, form.subscriptionLevel);
        }
        onSaved({ ...res.user, roles: form.roles, subscriptionLevel: form.subscriptionLevel });
      }
      onClose();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={userFormStyles.overlay}>
        <View style={userFormStyles.sheet}>
          <View style={userFormStyles.sheetHeader}>
            <Text style={userFormStyles.sheetTitle}>
              {mode === "create" ? "Nuevo Usuario" : "Editar Usuario"}
            </Text>
            <Pressable onPress={onClose} style={userFormStyles.closeBtn}>
              <Ionicons name="close" size={22} color="#888" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={userFormStyles.fieldLabel}>NOMBRE *</Text>
            <TextInput
              style={userFormStyles.input}
              value={form.displayName}
              onChangeText={(v) => setForm((p) => ({ ...p, displayName: v }))}
              placeholder="Nombre completo"
              placeholderTextColor="#444"
              autoCapitalize="words"
            />

            <Text style={userFormStyles.fieldLabel}>EMAIL *</Text>
            <TextInput
              style={userFormStyles.input}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#444"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={userFormStyles.fieldLabel}>
              {mode === "create" ? "CONTRASEÑA *" : "CONTRASEÑA (dejar vacío para no cambiar)"}
            </Text>
            <TextInput
              style={userFormStyles.input}
              value={form.password}
              onChangeText={(v) => setForm((p) => ({ ...p, password: v }))}
              placeholder={mode === "create" ? "Mínimo 6 caracteres" : "Nueva contraseña (opcional)"}
              placeholderTextColor="#444"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={userFormStyles.fieldLabel}>TELÉFONO</Text>
            <TextInput
              style={userFormStyles.input}
              value={form.phone}
              onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))}
              placeholder="+54 9 11 1234 5678"
              placeholderTextColor="#444"
              keyboardType="phone-pad"
            />

            <Text style={userFormStyles.fieldLabel}>ROLES</Text>
            <View style={userFormStyles.toggleRow}>
              {ROLES.map((role) => {
                const active = form.roles.includes(role);
                return (
                  <Pressable
                    key={role}
                    style={[userFormStyles.toggleChip, active && userFormStyles.toggleChipActive]}
                    onPress={() => toggleRole(role)}
                  >
                    <MaterialCommunityIcons
                      name={ROLE_ICONS[role] as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={14}
                      color={active ? "#000" : "#666"}
                    />
                    <Text style={[userFormStyles.toggleChipText, active && userFormStyles.toggleChipTextActive]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={userFormStyles.fieldLabel}>SUSCRIPCIÓN</Text>
            <View style={userFormStyles.toggleRow}>
              {SUB_LEVELS.map((level) => {
                const active = form.subscriptionLevel === level;
                return (
                  <Pressable
                    key={level}
                    style={[userFormStyles.toggleChip, active && userFormStyles.toggleChipGold]}
                    onPress={() => setForm((p) => ({ ...p, subscriptionLevel: level }))}
                  >
                    <Text style={[userFormStyles.toggleChipText, active && userFormStyles.toggleChipTextActive]}>
                      {SUB_LABELS[level]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={userFormStyles.switchRow}>
              <Text style={userFormStyles.fieldLabel}>MODO LUCHADOR</Text>
              <Switch
                value={form.isFighter}
                onValueChange={(v) => setForm((p) => ({ ...p, isFighter: v }))}
                thumbColor={form.isFighter ? "#D4AF37" : "#555"}
                trackColor={{ false: "#222", true: "#5a4800" }}
              />
            </View>

            <Text style={userFormStyles.fieldLabel}>SEDES</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {SEDES_OPTIONS.map((s) => {
                const active = form.sedes.includes(s.value);
                return (
                  <Pressable
                    key={s.value}
                    style={[userFormStyles.toggleChip, active && userFormStyles.toggleChipGold, { flex: 1 }]}
                    onPress={() =>
                      setForm((p) => ({
                        ...p,
                        sedes: active ? p.sedes.filter((x) => x !== s.value) : [...p.sedes, s.value],
                      }))
                    }
                  >
                    <Text style={[userFormStyles.toggleChipText, active && userFormStyles.toggleChipTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[userFormStyles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={userFormStyles.saveBtnText}>
                  {mode === "create" ? "Crear Usuario" : "Guardar Cambios"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const userFormStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  fieldLabel: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 8,
    color: "#FFF",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toggleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    backgroundColor: "#1a1a1a",
  },
  toggleChipActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  toggleChipGold: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  toggleChipText: {
    color: "#666",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
  },
  toggleChipTextActive: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnText: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    letterSpacing: 1,
  },
});

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
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [beltSectionOpen, setBeltSectionOpen] = useState<Record<number, boolean>>({});
  const [userBeltMap, setUserBeltMap] = useState<Record<number, AdminBeltUser>>({});
  const [beltDataLoading, setBeltDataLoading] = useState(false);
  const beltDataLoaded = useRef(false);
  const [discSectionOpen, setDiscSectionOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem("adminBeltSectionOpen").then((data) => {
      if (data) {
        try { setBeltSectionOpen(JSON.parse(data)); } catch { }
      }
    });
    AsyncStorage.getItem("adminDiscSectionOpen").then((data) => {
      if (data) {
        try { setDiscSectionOpen(JSON.parse(data)); } catch { }
      }
    });
  }, []);

  const toggleDiscSection = useCallback((userId: number, discipline: string) => {
    const key = `${userId}_${discipline}`;
    const newState = { ...discSectionOpen, [key]: !discSectionOpen[key] };
    setDiscSectionOpen(newState);
    AsyncStorage.setItem("adminDiscSectionOpen", JSON.stringify(newState));
  }, [discSectionOpen]);

  const [pendingApps, setPendingApps] = useState<PendingBeltApplication[]>([]);
  const [actingOnApp, setActingOnApp] = useState<Set<number>>(new Set());
  const [beltCatalog, setBeltCatalog] = useState<CatalogDiscipline[]>([]);
  const [assignModal, setAssignModal] = useState<{ userId: number; discipline: string } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const loadPendingApps = useCallback(async () => {
    try {
      const { applications } = await beltsApi.adminGetPendingApplications();
      setPendingApps(applications);
    } catch (e) {
      console.error("[UsersPanel] loadPendingApps error:", e instanceof Error ? e.message : e);
    }
  }, []);

  const loadBeltData = useCallback(async () => {
    if (beltDataLoaded.current) return;
    beltDataLoaded.current = true;
    setBeltDataLoading(true);
    try {
      const [{ users: beltUsers }, { catalog }] = await Promise.all([
        beltsApi.adminGetUsers(),
        beltsApi.adminGetCatalog(),
      ]);
      const map: Record<number, AdminBeltUser> = {};
      beltUsers.forEach((u) => { map[u.id] = u; });
      setUserBeltMap(map);
      setBeltCatalog(catalog);
    } catch (e) {
      console.error("[UsersPanel] loadBeltData error:", e instanceof Error ? e.message : e);
      beltDataLoaded.current = false;
    } finally {
      setBeltDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBeltData();
    loadPendingApps();
  }, [loadBeltData, loadPendingApps]);

  const handleActOnApp = useCallback(async (appId: number, action: "approve" | "reject") => {
    setActingOnApp((s) => new Set(s).add(appId));
    try {
      await beltsApi.adminActOnApplication(appId, action);
      setPendingApps((prev) => prev.filter((a) => a.id !== appId));
      beltDataLoaded.current = false;
      await Promise.all([loadBeltData(), loadPendingApps()]);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo procesar la postulación");
    } finally {
      setActingOnApp((s) => { const ns = new Set(s); ns.delete(appId); return ns; });
    }
  }, [loadBeltData, loadPendingApps]);

  const handleAssignBelt = useCallback(async (beltId: number, beltName: string) => {
    if (!assignModal) return;
    setAssigning(true);
    try {
      await beltsApi.adminAssignBelt(assignModal.userId, assignModal.discipline, beltId);
      beltDataLoaded.current = false;
      await loadBeltData();
      setAssignModal(null);
      Alert.alert("Listo", `${beltName} asignado correctamente`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo asignar el cinturón");
    } finally {
      setAssigning(false);
    }
  }, [assignModal, loadBeltData]);

  const toggleBeltSection = useCallback(async (userId: number) => {
    const willOpen = !beltSectionOpen[userId];
    const newState = { ...beltSectionOpen, [userId]: willOpen };
    setBeltSectionOpen(newState);
    AsyncStorage.setItem("adminBeltSectionOpen", JSON.stringify(newState));
    if (willOpen) {
      beltDataLoaded.current = false;
      loadBeltData();
      loadPendingApps();
    }
  }, [beltSectionOpen, loadBeltData, loadPendingApps]);

  const openCreate = () => {
    setFormMode("create");
    setEditingUser(null);
    setFormVisible(true);
  };

  const openEdit = (user: UserData) => {
    setFormMode("edit");
    setEditingUser(user);
    setFormVisible(true);
  };

  const handleSaved = (saved: UserData & { roles: string[] }) => {
    setUsers((prev) => {
      const exists = prev.find((u) => u.id === saved.id);
      if (exists) return prev.map((u) => u.id === saved.id ? { ...u, ...saved } : u);
      return [...prev, saved];
    });
  };

  const handleDelete = (user: UserData) => {
    const doDelete = async () => {
      try {
        await adminApi.deleteUser(user.id);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setExpandedUser(null);
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar");
      }
    };

    if (Platform.OS === "web") {
      // eslint-disable-next-line no-restricted-globals
      if ((window as Window & typeof globalThis).confirm(`¿Eliminar a "${user.displayName}"? Esta acción no se puede deshacer.`)) {
        doDelete();
      }
      return;
    }

    Alert.alert(
      "Eliminar Usuario",
      `¿Eliminar a "${user.displayName}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]
    );
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

  const [searchQuery, setSearchQuery] = useState("");
  const filteredUsers = searchQuery.trim() === ""
    ? users
    : users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <UserFormModal
        visible={formVisible}
        mode={formMode}
        initialData={editingUser}
        onClose={() => setFormVisible(false)}
        onSaved={handleSaved}
      />
      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { flex: 1 }]}>
          <Ionicons name="search" size={16} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            placeholderTextColor="#444"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.addUserBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#D4AF37" />
        </Pressable>
      </View>
      {filteredUsers.length === 0 && searchQuery.trim() !== "" && (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Text style={{ color: "#666", fontFamily: "NotoSansJP_400Regular", fontSize: 14 }}>
            Sin resultados para "{searchQuery}"
          </Text>
        </View>
      )}
      {filteredUsers.map((u) => {
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
                {getAvatarServingUrl(u.avatarUrl ?? null) ? (
                  <Image
                    source={{ uri: getAvatarServingUrl(u.avatarUrl ?? null)! }}
                    style={styles.userAvatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={14} color="#333" />
                )}
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
                size={13}
                color="#444"
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
                          size={11}
                          color={hasRole ? "#000" : "#555"}
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

                <Pressable
                  style={styles.beltSectionToggle}
                  onPress={() => toggleBeltSection(u.id)}
                >
                  <Text style={styles.sectionLabel}>CINTURONES</Text>
                  <Ionicons
                    name={beltSectionOpen[u.id] ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#555"
                  />
                </Pressable>

                {beltSectionOpen[u.id] && (
                  <View style={styles.beltMiniSection}>
                    {beltDataLoading ? (
                      <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 4 }} />
                    ) : (
                      ["ninjutsu", "jiujitsu"].map((discipline) => {
                        const userBelt = userBeltMap[u.id]?.belts.find((b) => b.discipline === discipline);
                        const pendingApp = pendingApps.find((a) => a.userId === u.id && a.discipline === discipline);
                        const cLower = userBelt ? userBelt.currentBelt.color.toLowerCase() : "";
                        const isDark = cLower === "#000000" || cLower === "#1c1c1c";
                        const isWh = cLower === "#ffffff";
                        const barColor = userBelt ? (isDark ? "#3a3a3a" : isWh ? "#ccc" : userBelt.currentBelt.color) : "#222";
                        const pCLower = pendingApp ? pendingApp.targetBeltColor.toLowerCase() : "";
                        const pIsDark = pCLower === "#000000" || pCLower === "#1c1c1c";
                        const pIsWh = pCLower === "#ffffff";
                        const pBarColor = pendingApp ? (pIsDark ? "#3a3a3a" : pIsWh ? "#ccc" : pendingApp.targetBeltColor) : "#222";
                        const pIsPunta = pendingApp ? pendingApp.targetBeltName.toLowerCase().includes("punta negra") : false;
                        const pIsFranja = pendingApp ? pendingApp.targetBeltName.toLowerCase().includes("franja roja") : false;
                        const isActing = pendingApp ? actingOnApp.has(pendingApp.id) : false;
                        return (
                          <View key={discipline} style={styles.discMiniRow}>
                            <View style={styles.discMiniRowMain}>
                              <View style={[styles.discMiniColorDot, { backgroundColor: barColor }]} />
                              <Text style={styles.discMiniLabel}>{DISCIPLINE_LABELS[discipline] || discipline}</Text>
                              <Text style={styles.discMiniBeltName} numberOfLines={1}>
                                {userBelt ? userBelt.currentBelt.name : "—"}
                              </Text>
                              <Pressable
                                style={styles.discMiniAssignBtn}
                                onPress={() => setAssignModal({ userId: u.id, discipline })}
                              >
                                <Text style={styles.discMiniAssignTxt}>Asignar</Text>
                              </Pressable>
                            </View>
                            {pendingApp && (
                              <View style={styles.discMiniPendingRow}>
                                <View style={[styles.discMiniPendingBar, { backgroundColor: pBarColor, overflow: "hidden" }]}>
                                  {pIsFranja && <View style={styles.pendingFranjaRoja} />}
                                  {pIsPunta && <View style={styles.pendingPuntaNegra} />}
                                </View>
                                <Text style={styles.discMiniPendingTxt} numberOfLines={1}>
                                  → {pendingApp.targetBeltName}
                                </Text>
                                {isActing ? (
                                  <ActivityIndicator size="small" color="#D4AF37" />
                                ) : (
                                  <View style={styles.discMiniActions}>
                                    <Pressable
                                      style={styles.discMiniApproveBtn}
                                      onPress={() => handleActOnApp(pendingApp.id, "approve")}
                                    >
                                      <Ionicons name="checkmark" size={11} color="#000" />
                                    </Pressable>
                                    <Pressable
                                      style={styles.discMiniRejectBtn}
                                      onPress={() => handleActOnApp(pendingApp.id, "reject")}
                                    >
                                      <Ionicons name="close" size={11} color="#fff" />
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                <View style={styles.userActionRow}>
                  <Pressable
                    style={styles.editUserBtn}
                    onPress={() => openEdit(u)}
                  >
                    <Ionicons name="pencil" size={10} color="#D4AF37" />
                    <Text style={styles.editUserBtnText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.editUserBtn, u.isFighter && { borderColor: "#D4AF37", backgroundColor: "#1a1400" }]}
                    onPress={async () => {
                      try {
                        await fightsApi.toggleFighterMode(u.id, !u.isFighter);
                        setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, isFighter: !u.isFighter } : x));
                      } catch {
                        Alert.alert("Error", "No se pudo cambiar el modo peleador");
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="sword-cross" size={10} color={u.isFighter ? "#D4AF37" : "#555"} />
                    <Text style={[styles.editUserBtnText, { color: u.isFighter ? "#D4AF37" : "#555" }]}>
                      {u.isFighter ? "Peleador" : "Peleador"}
                    </Text>
                  </Pressable>
                  {!isCurrentUser && (
                    <Pressable
                      style={styles.deleteUserBtn}
                      onPress={() => handleDelete(u)}
                    >
                      <Ionicons name="trash" size={10} color="#FF4444" />
                      <Text style={styles.deleteUserBtnText}>Eliminar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </Pressable>
        );
      })}

      {/* Belt Assignment Modal */}
      <Modal
        visible={!!assignModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModal(null)}
      >
        <View style={styles.assignModalOverlay}>
          <View style={styles.assignModalSheet}>
            <View style={styles.assignModalHeader}>
              <Text style={styles.assignModalTitle}>
                Asignar cinturón
              </Text>
              {assignModal && (
                <Text style={styles.assignModalSubtitle}>
                  {DISCIPLINE_LABELS[assignModal.discipline] || assignModal.discipline}
                </Text>
              )}
              <Pressable
                style={styles.assignModalClose}
                onPress={() => setAssignModal(null)}
              >
                <Ionicons name="close" size={20} color="#666" />
              </Pressable>
            </View>
            {assigning ? (
              <ActivityIndicator size="large" color="#D4AF37" style={{ marginVertical: 32 }} />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {assignModal && (() => {
                  const belts = beltCatalog.find((d) => d.discipline === assignModal.discipline)?.belts ?? [];
                  if (beltDataLoading || belts.length === 0) {
                    return <ActivityIndicator size="large" color="#D4AF37" style={{ marginVertical: 32 }} />;
                  }
                  return belts.map((belt) => {
                    const cLower = belt.color.toLowerCase();
                    const isDark = cLower === "#000000" || cLower === "#1c1c1c";
                    const isWh = cLower === "#ffffff";
                    const barBg = isDark ? "#3a3a3a" : isWh ? "#ccc" : belt.color;
                    const isPunta = belt.name.toLowerCase().includes("punta negra");
                    const isFranja = belt.name.toLowerCase().includes("franja roja");
                    return (
                      <Pressable
                        key={belt.id}
                        style={styles.assignBeltOption}
                        onPress={() => handleAssignBelt(belt.id, belt.name)}
                      >
                        <View style={[styles.assignBeltBarLg, { backgroundColor: barBg, overflow: "hidden" }]}>
                          {isFranja && <View style={styles.pendingFranjaRoja} />}
                          {isPunta && <View style={styles.pendingPuntaNegra} />}
                        </View>
                        <Text style={styles.assignBeltOptionName}>{belt.name}</Text>
                        <Ionicons name="chevron-forward" size={14} color="#444" />
                      </Pressable>
                    );
                  });
                })()}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const INIT_BELT_FORM = { visible: false, editingId: null as number | null, beltName: "", description: "" };
const INIT_REQ_FORM = { visible: false, beltId: null as number | null, editingId: null as number | null, title: "", description: "" };

function getStripeCount(name: string): number {
  const match = name.match(/(\d+)\s+franja/i);
  return match ? parseInt(match[1], 10) : 0;
}

function BeltCatalogPanel() {
  const [catalog, setCatalog] = useState<CatalogDiscipline[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDisc, setExpandedDisc] = useState<string | null>("ninjutsu");
  const [expandedBelt, setExpandedBelt] = useState<number | null>(null);
  const [beltForm, setBeltForm] = useState(INIT_BELT_FORM);
  const [reqForm, setReqForm] = useState(INIT_REQ_FORM);

  const loadCatalog = useCallback(async () => {
    setCatalogError(null);
    setLoadingCatalog(true);
    try {
      const data = await beltsApi.adminGetCatalog();
      setCatalog(data.catalog);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("[BeltCatalogPanel] loadCatalog error:", msg, e);
      setCatalogError(msg);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

    useEffect(() => { loadCatalog(); }, [loadCatalog]);

    const saveBelt = async () => {
      if (!beltForm.editingId) return;
      setSaving(true);
      try {
        await beltsApi.adminUpdateBelt(beltForm.editingId, {
          description: beltForm.description.trim() || null,
        });
        setBeltForm(INIT_BELT_FORM);
        await loadCatalog();
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
    };

    const saveRequirement = async () => {
      if (!reqForm.title.trim() || !reqForm.beltId) return;
      setSaving(true);
      try {
        if (reqForm.editingId) {
          await beltsApi.adminUpdateRequirement(reqForm.beltId, reqForm.editingId, {
            title: reqForm.title.trim(),
            description: reqForm.description.trim() || null,
          });
        } else {
          await beltsApi.adminCreateRequirement(reqForm.beltId, {
            title: reqForm.title.trim(),
            description: reqForm.description.trim() || undefined,
          });
        }
        setReqForm(INIT_REQ_FORM);
        await loadCatalog();
      } catch (e: unknown) {
        Alert.alert("Error", e instanceof Error ? e.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
    };

    const deleteRequirement = (beltId: number, req: CatalogRequirement) => {
      Alert.alert("Eliminar Requerimiento", `¿Eliminar "${req.title}"?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await beltsApi.adminDeleteRequirement(beltId, req.id);
              await loadCatalog();
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar");
            } finally {
              setSaving(false);
            }
          },
        },
      ]);
    };

    if (loadingCatalog) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color="#D4AF37" size="large" />
        </View>
      );
    }

    if (catalogError) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#D4AF37" />
          <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "600", marginTop: 8 }}>No se pudo cargar el catálogo</Text>
          <Text style={{ color: "#666", fontSize: 11, marginTop: 4, textAlign: "center" }}>{catalogError}</Text>
          <Pressable style={[styles.catalogFormSave, { marginTop: 16, paddingHorizontal: 24 }]} onPress={loadCatalog}>
            <MaterialCommunityIcons name="refresh" size={16} color="#000" />
            <Text style={styles.catalogFormSaveText}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View>
        {catalog.map((disc) => {
          const isDiscOpen = expandedDisc === disc.discipline;
          const discLabel = DISCIPLINE_LABELS[disc.discipline] || disc.discipline;

          const discKanji = DISCIPLINE_KANJI[disc.discipline] || "";
          const discSubtitle = DISCIPLINE_SUBTITLE[disc.discipline] || "";

          return (
            <View key={disc.discipline} style={styles.catalogSection}>
              <Pressable
                style={styles.catalogDiscHeader}
                onPress={() => setExpandedDisc(isDiscOpen ? null : disc.discipline)}
              >
                <Text style={styles.catalogDiscKanjiWatermark}>{discKanji}</Text>
                <View style={styles.catalogDiscLeft}>
                  <View style={styles.catalogDiscPill}>
                    <MaterialCommunityIcons
                      name={disc.discipline === "ninjutsu" ? "star-four-points" : "feather"}
                      size={11}
                      color="#D4AF37"
                    />
                    <Text style={styles.catalogDiscPillText}>{discLabel}</Text>
                    <View style={styles.catalogBeltCount}>
                      <Text style={styles.catalogBeltCountText}>{disc.belts.length}</Text>
                    </View>
                  </View>
                  <Text style={styles.catalogDiscKanji}>{discKanji}</Text>
                  <Text style={styles.catalogDiscSubtitle}>{discSubtitle}</Text>
                </View>
                <Ionicons name={isDiscOpen ? "chevron-up" : "chevron-down"} size={18} color="#555" />
              </Pressable>

              {isDiscOpen && (
                <View style={styles.catalogDiscContent}>
                  {disc.belts.length === 0 && (
                    <Text style={styles.noHistoryText}>Sin cinturones. Agrega el primero.</Text>
                  )}

                  {disc.belts.map((belt) => {
                    const isBeltOpen = expandedBelt === belt.id;
                    const isEditingBelt = beltForm.visible && beltForm.editingId === belt.id;
                    const isAddingReq = reqForm.visible && reqForm.beltId === belt.id && !reqForm.editingId;
                    const colorLower = belt.color.toLowerCase();
                    const isVeryDark = colorLower === "#000000" || colorLower === "#1c1c1c" || colorLower === "#212121";
                    const isWhite = colorLower === "#ffffff";
                    const beltBarColor = isVeryDark ? "#2a2a2a" : isWhite ? "#E0E0E0" : belt.color;
                    const beltStripes = getStripeCount(belt.name);
                    const beltStripeColor = isVeryDark ? "#D4AF37" : "#000000";
                    const beltNameLower = belt.name.toLowerCase();
                    const beltIsPuntaNegra = beltNameLower.includes("punta negra");
                    const beltIsFranjaRoja = beltNameLower.includes("franja roja");
                    const beltStripePositions = beltStripes > 0
                      ? Array.from({ length: beltStripes }, (_, i) => {
                          const zoneStart = 20;
                          const zoneWidth = 13;
                          const step = zoneWidth / beltStripes;
                          return Math.round(zoneStart + step * i + step * 0.35);
                        })
                      : [];

                    return (
                      <View key={belt.id} style={styles.catalogBeltItem}>
                        <Pressable
                          style={styles.catalogBeltHeader}
                          onPress={() => setExpandedBelt(isBeltOpen ? null : belt.id)}
                        >
                          <View style={[styles.catalogBeltColorBar, { backgroundColor: beltBarColor }]}>
                            {beltIsFranjaRoja && (
                              <View style={{
                                position: "absolute",
                                left: "38%",
                                width: "20%",
                                top: 0,
                                bottom: 0,
                                backgroundColor: "#CC0000",
                              }} />
                            )}
                            {beltIsPuntaNegra && (
                              <View style={{
                                position: "absolute",
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: "30%",
                                backgroundColor: "#000000",
                              }} />
                            )}
                            {beltStripePositions.map((leftPx, si) => (
                              <View
                                key={si}
                                style={{
                                  position: "absolute",
                                  left: leftPx,
                                  top: 2,
                                  bottom: 2,
                                  width: 2,
                                  backgroundColor: beltStripeColor,
                                  borderRadius: 1,
                                }}
                              />
                            ))}
                          </View>
                          <Text style={styles.catalogBeltName} numberOfLines={1}>{belt.name.toUpperCase()}</Text>
                          <View style={styles.catalogBeltActions}>
                            <Pressable
                              style={styles.catalogIconBtn}
                              onPress={() => {
                                setExpandedBelt(belt.id);
                                setBeltForm({
                                  visible: true,
                                  editingId: belt.id,
                                  beltName: belt.name,
                                  description: belt.description || "",
                                });
                              }}
                            >
                              <Ionicons name="pencil" size={15} color="#D4AF37" />
                            </Pressable>
                            <Ionicons
                              name={isBeltOpen ? "chevron-up" : "chevron-down"}
                              size={15}
                              color="#333"
                            />
                          </View>
                        </Pressable>

                        {isEditingBelt && (
                          <View style={styles.catalogForm}>
                            <Text style={styles.catalogFormTitle}>{beltForm.beltName}</Text>
                            <TextInput
                              style={[styles.catalogFormInput, { minHeight: 72 }]}
                              placeholder="Descripción del cinturón (opcional)"
                              placeholderTextColor="#444"
                              value={beltForm.description}
                              onChangeText={(v) => setBeltForm((f) => ({ ...f, description: v }))}
                              multiline
                              numberOfLines={3}
                            />
                            <View style={styles.catalogFormActions}>
                              <Pressable style={styles.catalogFormCancel} onPress={() => setBeltForm(INIT_BELT_FORM)}>
                                <Text style={styles.catalogFormCancelText}>Cancelar</Text>
                              </Pressable>
                              <Pressable style={styles.catalogFormSave} onPress={saveBelt} disabled={saving}>
                                {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.catalogFormSaveText}>Guardar</Text>}
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {isBeltOpen && (
                          <View style={styles.catalogBeltContent}>
                            {belt.description ? (
                              <Text style={styles.catalogBeltDesc}>{belt.description}</Text>
                            ) : null}

                            <Text style={styles.catalogReqSectionLabel}>要件 · REQUERIMIENTOS</Text>

                            {belt.requirements.length === 0 && (
                              <Text style={styles.noHistoryText}>Sin requerimientos.</Text>
                            )}

                            {belt.requirements.map((req, reqIdx) => {
                              const isEditingReq = reqForm.visible && reqForm.editingId === req.id;
                              return (
                                <View key={req.id} style={styles.catalogReqItem}>
                                  {isEditingReq ? (
                                    <View style={styles.catalogForm}>
                                      <TextInput
                                        style={styles.catalogFormInput}
                                        placeholder="Título"
                                        placeholderTextColor="#444"
                                        value={reqForm.title}
                                        onChangeText={(v) => setReqForm((f) => ({ ...f, title: v }))}
                                      />
                                      <TextInput
                                        style={styles.catalogFormInput}
                                        placeholder="Descripción (opcional)"
                                        placeholderTextColor="#444"
                                        value={reqForm.description}
                                        onChangeText={(v) => setReqForm((f) => ({ ...f, description: v }))}
                                      />
                                      <View style={styles.catalogFormActions}>
                                        <Pressable style={styles.catalogFormCancel} onPress={() => setReqForm(INIT_REQ_FORM)}>
                                          <Text style={styles.catalogFormCancelText}>Cancelar</Text>
                                        </Pressable>
                                        <Pressable style={styles.catalogFormSave} onPress={saveRequirement} disabled={saving}>
                                          {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.catalogFormSaveText}>Guardar</Text>}
                                        </Pressable>
                                      </View>
                                    </View>
                                  ) : (
                                    <View style={styles.catalogReqRow}>
                                      <View style={styles.catalogReqNum}>
                                        <Text style={styles.catalogReqNumText}>{reqIdx + 1}</Text>
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.catalogReqTitle}>{req.title}</Text>
                                        {req.description ? (
                                          <Text style={styles.catalogReqDesc}>{req.description}</Text>
                                        ) : null}
                                      </View>
                                      <Pressable
                                        style={styles.catalogIconBtn}
                                        onPress={() => setReqForm({
                                          visible: true,
                                          beltId: belt.id,
                                          editingId: req.id,
                                          title: req.title,
                                          description: req.description || "",
                                        })}
                                      >
                                        <Ionicons name="pencil" size={14} color="#888" />
                                      </Pressable>
                                      <Pressable
                                        style={styles.catalogIconBtn}
                                        onPress={() => deleteRequirement(belt.id, req)}
                                      >
                                        <Ionicons name="trash-outline" size={14} color="#555" />
                                      </Pressable>
                                    </View>
                                  )}
                                </View>
                              );
                            })}

                            {isAddingReq ? (
                              <View style={styles.catalogForm}>
                                <TextInput
                                  style={styles.catalogFormInput}
                                  placeholder="Título del requerimiento"
                                  placeholderTextColor="#444"
                                  value={reqForm.title}
                                  onChangeText={(v) => setReqForm((f) => ({ ...f, title: v }))}
                                />
                                <TextInput
                                  style={styles.catalogFormInput}
                                  placeholder="Descripción (opcional)"
                                  placeholderTextColor="#444"
                                  value={reqForm.description}
                                  onChangeText={(v) => setReqForm((f) => ({ ...f, description: v }))}
                                />
                                <View style={styles.catalogFormActions}>
                                  <Pressable style={styles.catalogFormCancel} onPress={() => setReqForm(INIT_REQ_FORM)}>
                                    <Text style={styles.catalogFormCancelText}>Cancelar</Text>
                                  </Pressable>
                                  <Pressable style={styles.catalogFormSave} onPress={saveRequirement} disabled={saving}>
                                    {saving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.catalogFormSaveText}>Agregar</Text>}
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <Pressable
                                style={[styles.beltActionButton, { marginTop: 6 }]}
                                onPress={() => setReqForm({ visible: true, beltId: belt.id, editingId: null, title: "", description: "" })}
                              >
                                <Ionicons name="add-circle" size={14} color="#D4AF37" />
                                <Text style={styles.beltActionText}>Agregar Requerimiento</Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}

                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  }
function FightsPanel({ users, onRefreshUsers }: { users: UserData[]; onRefreshUsers: () => Promise<void> }) {
  type FighterEntry = { fights: FightData[]; stats: FightStats | null; loading: boolean };
  const [fighterData, setFighterData] = useState<Record<number, FighterEntry>>({});
  const [expandedFighter, setExpandedFighter] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState<number | null>(null);
  const [editingFightId, setEditingFightId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [formOpponent, setFormOpponent] = useState("");
  const [formEvent, setFormEvent] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formResult, setFormResult] = useState<"victoria" | "derrota" | "empate">("victoria");
  const [formMethod, setFormMethod] = useState("");
  const [formDiscipline, setFormDiscipline] = useState("mma");
  const [formRounds, setFormRounds] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const fighters = users.filter((u) => u.isFighter);
  const fighterIdsKey = fighters.map((f) => f.id).join(",");

  const loadFighterData = useCallback(async (userId: number) => {
    setFighterData((prev) => ({ ...prev, [userId]: { fights: [], stats: null, loading: true } }));
    try {
      const data = await fightsApi.getUserFights(userId);
      setFighterData((prev) => ({ ...prev, [userId]: { fights: data.fights, stats: data.stats, loading: false } }));
    } catch {
      setFighterData((prev) => ({ ...prev, [userId]: { fights: [], stats: null, loading: false } }));
    }
  }, []);

  useEffect(() => {
    fighters.forEach((f) => loadFighterData(f.id));
  }, [fighterIdsKey]);

  const toggleExpand = (fighterId: number) => {
    if (expandedFighter === fighterId) {
      setExpandedFighter(null);
      setShowAddForm(null);
      setEditingFightId(null);
    } else {
      setExpandedFighter(fighterId);
      setShowAddForm(null);
      setEditingFightId(null);
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
  };

  const openAddForm = (fighterId: number) => {
    resetForm();
    setShowAddForm(fighterId);
    setEditingFightId(null);
  };

  const openEditForm = (fight: FightData) => {
    setFormOpponent(fight.opponentName);
    setFormEvent(fight.eventName || "");
    setFormDate(fight.fightDate);
    setFormResult(fight.result as "victoria" | "derrota" | "empate");
    setFormMethod(fight.method || "");
    setFormDiscipline(fight.discipline);
    setFormRounds(fight.rounds ? String(fight.rounds) : "");
    setFormNotes(fight.notes || "");
    setEditingFightId(fight.id);
    setShowAddForm(null);
  };

  const handleAddFight = async (userId: number) => {
    if (!formOpponent.trim() || !formDate.trim()) {
      Alert.alert("Error", "Se requiere oponente y fecha");
      return;
    }
    setActionLoading("add-fight");
    try {
      const data: AddFightData = {
        userId,
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
      setShowAddForm(null);
      await loadFighterData(userId);
      Alert.alert("Éxito", "Pelea registrada");
    } catch {
      Alert.alert("Error", "No se pudo registrar la pelea");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateFight = async (fightId: number, userId: number) => {
    if (!formOpponent.trim() || !formDate.trim()) {
      Alert.alert("Error", "Se requiere oponente y fecha");
      return;
    }
    setActionLoading(`edit-${fightId}`);
    try {
      await fightsApi.updateFight(fightId, {
        opponentName: formOpponent.trim(),
        fightDate: formDate.trim(),
        result: formResult,
        discipline: formDiscipline,
        eventName: formEvent.trim() || undefined,
        method: formMethod || undefined,
        rounds: formRounds.trim() ? parseInt(formRounds, 10) : undefined,
        notes: formNotes.trim() || undefined,
      });
      setEditingFightId(null);
      resetForm();
      await loadFighterData(userId);
      Alert.alert("Éxito", "Pelea actualizada");
    } catch {
      Alert.alert("Error", "No se pudo actualizar la pelea");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteFight = async (fightId: number, userId: number) => {
    Alert.alert("Confirmar", "¿Eliminar esta pelea del registro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          setActionLoading(`del-${fightId}`);
          try {
            await fightsApi.deleteFight(fightId);
            await loadFighterData(userId);
          } catch {
            Alert.alert("Error", "No se pudo eliminar la pelea");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const renderFightForm = (userId: number, fightId?: number) => (
    <View style={styles.fightFormContainer}>
      <TextInput style={styles.fightFormInput} placeholder="Oponente *" placeholderTextColor="#555" value={formOpponent} onChangeText={setFormOpponent} />
      <TextInput style={styles.fightFormInput} placeholder="Evento (opcional)" placeholderTextColor="#555" value={formEvent} onChangeText={setFormEvent} />
      <TextInput style={styles.fightFormInput} placeholder="Fecha (YYYY-MM-DD) *" placeholderTextColor="#555" value={formDate} onChangeText={setFormDate} />
      <Text style={styles.fightFormLabel}>Resultado</Text>
      <View style={styles.toggleGroup}>
        {(["victoria", "derrota", "empate"] as const).map((r) => (
          <Pressable key={r} style={[styles.toggleButton, formResult === r && styles.toggleButtonActive]} onPress={() => setFormResult(r)}>
            <Text style={[styles.toggleText, formResult === r && styles.toggleTextActive]}>{FIGHT_RESULT_LABELS[r]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fightFormLabel}>Disciplina</Text>
      <View style={styles.toggleGroup}>
        {FIGHT_DISCIPLINE_OPTIONS.map((d) => (
          <Pressable key={d.value} style={[styles.toggleButton, formDiscipline === d.value && styles.toggleButtonActive]} onPress={() => setFormDiscipline(d.value)}>
            <Text style={[styles.toggleText, formDiscipline === d.value && styles.toggleTextActive]}>{d.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.fightFormLabel}>Método</Text>
      <View style={styles.toggleGroup}>
        {FIGHT_METHOD_OPTIONS.map((m) => (
          <Pressable key={m.value} style={[styles.toggleButton, formMethod === m.value && styles.toggleButtonActive]} onPress={() => setFormMethod(m.value)}>
            <Text style={[styles.toggleText, formMethod === m.value && styles.toggleTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.fightFormInput} placeholder="Rounds" placeholderTextColor="#555" value={formRounds} onChangeText={setFormRounds} keyboardType="numeric" />
      <TextInput style={[styles.fightFormInput, { height: 60 }]} placeholder="Notas" placeholderTextColor="#555" value={formNotes} onChangeText={setFormNotes} multiline />
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Pressable
          style={[styles.beltActionButton, { flex: 1 }]}
          onPress={() => { if (fightId) { setEditingFightId(null); } else { setShowAddForm(null); } resetForm(); }}
        >
          <Text style={styles.beltActionText}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.beltPromoteButton, { flex: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 4, alignItems: "center" }]}
          onPress={() => fightId ? handleUpdateFight(fightId, userId) : handleAddFight(userId)}
          disabled={!!actionLoading}
        >
          {actionLoading === (fightId ? `edit-${fightId}` : "add-fight") ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.beltPromoteText}>{fightId ? "Guardar" : "Registrar"}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );

  if (fighters.length === 0) {
    return (
      <View>
        <Text style={[styles.noHistoryText, { textAlign: "center", padding: 24 }]}>
          No hay usuarios con modo peleador activo.{"\n"}Actívalo desde la sección de Usuarios.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {fighters.map((f) => {
        const entry = fighterData[f.id];
        const isExpanded = expandedFighter === f.id;
        const stats = entry?.stats;
        const fights = entry?.fights ?? [];
        const isLoading = entry?.loading ?? false;
        return (
          <View key={f.id} style={styles.fighterRow}>
            <Pressable style={styles.fighterRowHeader} onPress={() => toggleExpand(f.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fighterRowName}>{f.displayName}</Text>
              </View>
              <Text style={styles.fighterRowRecord}>
                {stats ? (
                  <>
                    <Text style={{ color: "#FFF" }}>V</Text>
                    <Text style={{ color: "#22C55E" }}>{stats.victorias}</Text>
                    <Text style={{ color: "#FFF" }}>-D</Text>
                    <Text style={{ color: "#EF4444" }}>{stats.derrotas}</Text>
                    <Text style={{ color: "#FFF" }}>-E</Text>
                    <Text style={{ color: "#888" }}>{stats.empates}</Text>
                  </>
                ) : (
                  isLoading ? "…" : "—"
                )}
              </Text>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={13} color="#555" style={{ marginLeft: 8 }} />
            </Pressable>

            {isExpanded && (
              <View style={styles.fighterRowExpanded}>
                {isLoading ? (
                  <ActivityIndicator color="#D4AF37" style={{ marginVertical: 12 }} />
                ) : (
                  <>
                    {stats && (
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
                    )}

                    {showAddForm === f.id ? renderFightForm(f.id) : (
                      <Pressable style={styles.beltActionButton} onPress={() => openAddForm(f.id)}>
                        <MaterialCommunityIcons name="plus-circle" size={13} color="#D4AF37" />
                        <Text style={styles.beltActionText}>Registrar Pelea</Text>
                      </Pressable>
                    )}

                    <View style={styles.sectionDivider} />

                    {fights.length === 0 ? (
                      <Text style={styles.noHistoryText}>Sin peleas registradas</Text>
                    ) : (
                      fights.map((fight) => {
                        const resultColor = fight.result === "victoria" ? "#22C55E" : fight.result === "derrota" ? "#EF4444" : "#F59E0B";
                        const dateStr = new Date(fight.fightDate).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });

                        if (editingFightId === fight.id) {
                          return (
                            <View key={fight.id}>
                              <Text style={[styles.fightFormLabel, { marginBottom: 6 }]}>Editando: vs {fight.opponentName}</Text>
                              {renderFightForm(f.id, fight.id)}
                            </View>
                          );
                        }

                        return (
                          <View key={fight.id} style={styles.fightAdminCard}>
                            <View style={styles.fightAdminHeader}>
                              <View style={[styles.fightResultDot, { backgroundColor: resultColor }]} />
                              <Text style={[styles.fightAdminResult, { flex: 1 }]}>
                                {FIGHT_RESULT_LABELS[fight.result]} vs {fight.opponentName}
                              </Text>
                              <Pressable style={{ padding: 4, marginRight: 4 }} onPress={() => openEditForm(fight)} disabled={!!actionLoading}>
                                <Ionicons name="pencil" size={13} color="#888" />
                              </Pressable>
                              <Pressable style={{ padding: 4 }} onPress={() => handleDeleteFight(fight.id, f.id)} disabled={actionLoading === `del-${fight.id}`}>
                                {actionLoading === `del-${fight.id}` ? (
                                  <ActivityIndicator size="small" color="#FF4444" />
                                ) : (
                                  <Ionicons name="trash-outline" size={13} color="#555" />
                                )}
                              </Pressable>
                            </View>
                            <Text style={styles.historyDate}>
                              {dateStr} · {FIGHT_DISCIPLINE_OPTIONS.find((d) => d.value === fight.discipline)?.label || fight.discipline}
                              {fight.method ? ` · ${FIGHT_METHOD_OPTIONS.find((m) => m.value === fight.method)?.label || fight.method}` : ""}
                            </Text>
                            {fight.eventName && <Text style={styles.historyNotes}>{fight.eventName}</Text>}
                          </View>
                        );
                      })
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const TARGET_LABELS: Record<string, string> = {
  todas: "Todos",
  bogota: "Bogotá",
  chia: "Chía",
  peleadores: "Peleadores",
};

function NotificationsPanel() {
  const { refresh: refreshBell } = useNotifications();
  const [notifs, setNotifs] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("todas");

  const load = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifs(data.notifications);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Completa título y mensaje");
      return;
    }
    setSending(true);
    try {
      const res = await notificationsApi.send(title.trim(), body.trim(), target);
      setNotifs((prev) => [{ ...res.notification, readAt: null, createdByName: null }, ...prev]);
      setTitle("");
      setBody("");
      setTarget("todas");
      refreshBell();
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo enviar");
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      <View style={styles.notifComposeCard}>
        <Text style={styles.notifComposeTitle}>
          <Ionicons name="megaphone-outline" size={14} color="#D4AF37" /> Nueva notificación
        </Text>
        <TextInput
          style={styles.notifInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor="#333"
          maxLength={120}
        />
        <TextInput
          style={[styles.notifInput, styles.notifBodyInput]}
          value={body}
          onChangeText={setBody}
          placeholder="Mensaje..."
          placeholderTextColor="#333"
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text style={styles.notifTargetLabel}>ENVIAR A</Text>
        <View style={styles.notifTargetRow}>
          {NOTIFICATION_TARGETS.map((t) => (
            <Pressable
              key={t.value}
              style={[styles.notifTargetChip, target === t.value && styles.notifTargetChipActive]}
              onPress={() => setTarget(t.value)}
            >
              <Text style={[styles.notifTargetChipText, target === t.value && styles.notifTargetChipTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.notifSendBtn} onPress={handleSend} disabled={sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <>
              <Ionicons name="send" size={14} color="#000" />
              <Text style={styles.notifSendBtnText}>Enviar</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.notifHistoryTitle}>Historial</Text>

      {loading ? (
        <ActivityIndicator color="#D4AF37" style={{ marginTop: 20 }} />
      ) : notifs.length === 0 ? (
        <Text style={styles.notifEmpty}>Sin notificaciones enviadas</Text>
      ) : (
        notifs.map((n) => (
          <View key={n.id} style={styles.notifHistoryItem}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.notifHistoryItemTitle}>{n.title}</Text>
              <View style={styles.notifTargetBadge}>
                <Text style={styles.notifTargetBadgeText}>
                  {TARGET_LABELS[n.target] ?? n.target}
                </Text>
              </View>
            </View>
            <Text style={styles.notifHistoryItemBody}>{n.body}</Text>
            <Text style={styles.notifHistoryItemDate}>
              {new Date(n.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("usuarios");
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const usersRes = await adminApi.getUsers();
      setUsers(usersRes.users);
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
              size={20}
              color={activeTab === "usuarios" ? "#000" : "#666"}
            />
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "cinturones" && styles.tabButtonActive]}
            onPress={() => setActiveTab("cinturones")}
          >
            <MaterialCommunityIcons
              name="medal"
              size={20}
              color={activeTab === "cinturones" ? "#000" : "#666"}
            />
          </Pressable>
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
        ) : activeTab === "cinturones" ? (
          <BeltCatalogPanel />
        ) : activeTab === "peleas" ? (
          <FightsPanel users={users} onRefreshUsers={async () => {
            const res = await adminApi.getUsers();
            setUsers(res.users);
          }} />
        ) : (
          <NotificationsPanel />
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
    backgroundColor: "#070707",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#111",
    borderTopWidth: 1,
    borderTopColor: "#D4AF3722",
    padding: 10,
    marginBottom: 6,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  userAvatar: {
    width: 30,
    height: 30,
    borderRadius: 2,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  userAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 2,
  },
  pendingAppsSection: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D4AF3730",
    borderRadius: 4,
    padding: 8,
    backgroundColor: "#0A0800",
  },
  pendingAppsLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#D4AF37",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  pendingAppRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  pendingBeltBar: {
    width: 32,
    height: 14,
    borderRadius: 2,
    position: "relative",
  },
  pendingFranjaRoja: {
    position: "absolute",
    left: "38%",
    width: "20%",
    top: 0,
    bottom: 0,
    backgroundColor: "#CC0000",
  },
  pendingPuntaNegra: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "30%",
    backgroundColor: "#000000",
  },
  pendingAppInfo: {
    flex: 1,
  },
  pendingBeltName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#CCC",
  },
  pendingDiscLabel: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 9,
    color: "#666",
    letterSpacing: 1,
  },
  pendingAppActions: {
    flexDirection: "row",
    gap: 6,
  },
  approveBtn: {
    backgroundColor: "#D4AF37",
    borderRadius: 4,
    padding: 5,
  },
  rejectBtn: {
    backgroundColor: "#3a1010",
    borderRadius: 4,
    padding: 5,
    borderWidth: 1,
    borderColor: "#6a2020",
  },
  discToggleLabelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discMiniBar: {
    width: 18,
    height: 8,
    borderRadius: 1,
  },
  discCurrentBeltName: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 9,
    color: "#555",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  discExpandedContent: {
    paddingLeft: 8,
    paddingBottom: 8,
  },
  assignBeltBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#D4AF37",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  assignBeltBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#000",
    letterSpacing: 0.5,
  },
  assignModalOverlay: {
    flex: 1,
    backgroundColor: "#000000BB",
    justifyContent: "flex-end",
  },
  assignModalSheet: {
    backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderTopColor: "#D4AF3730",
    maxHeight: "80%",
    paddingBottom: 40,
  },
  assignModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1A1A1A",
  },
  assignModalTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  assignModalSubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  assignModalClose: {
    padding: 4,
  },
  assignBeltOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  assignBeltBarLg: {
    width: 44,
    height: 18,
    borderRadius: 2,
    position: "relative",
  },
  assignBeltOptionName: {
    flex: 1,
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#CCC",
  },
  userInfo: {
    flex: 1,
    gap: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  youBadge: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 8,
    color: "#D4AF37",
    backgroundColor: "#1A1500",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 1,
    overflow: "hidden",
  },
  userEmail: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#444",
  },
  roleBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 3,
  },
  roleBadge: {
    backgroundColor: "#111",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 1,
  },
  roleBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#888",
    letterSpacing: 0.8,
  },
  subBadge: {
    backgroundColor: "#0D0B00",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 1,
    borderWidth: 1,
    borderColor: "#D4AF3730",
  },
  subBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 0.8,
  },
  expandedContent: {
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: "#111",
    marginVertical: 8,
  },
  sectionLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#444",
    letterSpacing: 2.5,
    marginBottom: 5,
  },
  toggleGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#1C1C1C",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
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
    color: "#666",
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
  beltSectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
    marginTop: 2,
    marginBottom: 2,
  },
  discToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    marginBottom: 4,
  },
  discToggleLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888",
    letterSpacing: 1.5,
  },
  beltMiniSection: {
    paddingVertical: 4,
    gap: 0,
  },
  discMiniRow: {
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  discMiniRowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discMiniColorDot: {
    width: 10,
    height: 10,
    borderRadius: 1,
  },
  discMiniLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#777",
    letterSpacing: 1.2,
    width: 66,
  },
  discMiniBeltName: {
    flex: 1,
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#AAA",
  },
  discMiniAssignBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#D4AF3760",
    borderRadius: 2,
  },
  discMiniAssignTxt: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 0.5,
  },
  discMiniPendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingLeft: 16,
  },
  discMiniPendingBar: {
    width: 28,
    height: 8,
    borderRadius: 1,
  },
  discMiniPendingTxt: {
    flex: 1,
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#D4AF37",
  },
  discMiniActions: {
    flexDirection: "row",
    gap: 4,
  },
  discMiniApproveBtn: {
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    padding: 3,
  },
  discMiniRejectBtn: {
    backgroundColor: "#3a1010",
    borderRadius: 2,
    padding: 3,
    borderWidth: 1,
    borderColor: "#6a2020",
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
  fighterToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fighterRow: {
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
    marginBottom: 8,
    borderRadius: 2,
    overflow: "hidden",
  },
  fighterRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0A0A0A",
  },
  fighterRowName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#FFF",
    letterSpacing: 1,
  },
  fighterRowRecord: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#D4AF37",
    letterSpacing: 2,
    marginLeft: 8,
  },
  fighterRowExpanded: {
    backgroundColor: "#050505",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 13,
    color: "#888",
    letterSpacing: 2,
    marginTop: 4,
  },
  fightAdminCard: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  fightAdminHeader: {
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
  fightAdminResult: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#DDD",
    flex: 1,
  },
  catalogSection: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1C1C1C",
    borderRadius: 2,
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
    overflow: "hidden",
  },
  catalogDiscHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: "#060606",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  catalogDiscKanjiWatermark: {
    position: "absolute",
    right: -8,
    top: -20,
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 100,
    color: "#0F0F0F",
  },
  catalogDiscLeft: {
    gap: 4,
    flex: 1,
  },
  catalogDiscPill: {
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
    marginBottom: 4,
  },
  catalogDiscPillText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  catalogDiscKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    lineHeight: 40,
  },
  catalogDiscSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 11,
    color: "#555",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  catalogBeltCount: {
    backgroundColor: "#1A1500",
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  catalogBeltCountText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#D4AF37",
  },
  catalogDiscContent: {
    backgroundColor: "#050505",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 10,
    gap: 6,
  },
  catalogBeltItem: {
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 2,
    marginBottom: 6,
    overflow: "hidden",
  },
  catalogBeltHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 11,
    backgroundColor: "#0A0A0A",
  },
  catalogBeltColorBar: {
    width: 36,
    height: 18,
    borderRadius: 2,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  catalogBeltColorStripe: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 8,
  },
  catalogBeltName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#CCC",
    flex: 1,
    letterSpacing: 2,
  },
  catalogBeltActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  catalogIconBtn: {
    padding: 4,
  },
  catalogBeltContent: {
    backgroundColor: "#080808",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  catalogBeltDesc: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
    lineHeight: 18,
  },
  catalogReqSectionLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#444",
    letterSpacing: 3,
    marginTop: 2,
  },
  catalogReqItem: {
    marginBottom: 2,
  },
  catalogReqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  catalogReqNum: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: "#0D0A00",
    borderWidth: 1,
    borderColor: "#2a2000",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  catalogReqNumText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    color: "#D4AF37",
  },
  catalogReqTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#CCC",
    lineHeight: 17,
  },
  catalogReqDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  catalogForm: {
    backgroundColor: "#0A0A00",
    borderWidth: 1,
    borderColor: "#1E1800",
    borderRadius: 2,
    borderLeftWidth: 2,
    borderLeftColor: "#D4AF37",
    padding: 12,
    marginTop: 4,
    gap: 8,
  },
  catalogFormTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 2,
    marginBottom: 2,
  },
  catalogFormInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1C1C1C",
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
  },
  catalogFormActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  catalogFormCancel: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 2,
    borderWidth: 1,
    borderColor: "#1A1A1A",
  },
  catalogFormCancelText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#555",
  },
  catalogFormSave: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  catalogFormSaveText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#000",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  addUserBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  userActionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#111",
    justifyContent: "flex-end",
  },
  editUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#D4AF3760",
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  editUserBtnText: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  deleteUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#FF444440",
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  deleteUserBtnText: {
    color: "#FF4444",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  notifComposeCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderTopWidth: 2,
    borderTopColor: "#D4AF37",
    borderRadius: 2,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  notifComposeTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#D4AF37",
    letterSpacing: 1,
    marginBottom: 4,
  },
  notifInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFF",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
  },
  notifBodyInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  notifSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    paddingVertical: 11,
  },
  notifSendBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#000",
    letterSpacing: 0.5,
  },
  notifHistoryTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#555",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  notifEmpty: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    marginTop: 24,
  },
  notifHistoryItem: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 12,
    marginBottom: 8,
    gap: 4,
  },
  notifHistoryItemTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#DDD",
    letterSpacing: 0.3,
  },
  notifHistoryItemBody: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  notifHistoryItemDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
  notifTargetLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 1.5,
    marginTop: 10,
    marginBottom: 6,
  },
  notifTargetRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  notifTargetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 2,
    backgroundColor: "#0A0A0A",
  },
  notifTargetChipActive: {
    borderColor: "#D4AF37",
    backgroundColor: "#1A1500",
  },
  notifTargetChipText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#555",
  },
  notifTargetChipTextActive: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_500Medium",
  },
  notifTargetBadge: {
    backgroundColor: "#1A1500",
    borderWidth: 1,
    borderColor: "#3A3000",
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  notifTargetBadgeText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 0.5,
  },
});
