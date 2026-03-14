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
  Modal,
  KeyboardAvoidingView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, beltsApi, fightsApi, type UserData, type FightData, type FightStats, type AddFightData, type CatalogDiscipline, type CatalogBelt, type CatalogRequirement } from "@/lib/api";

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

type AdminTab = "usuarios" | "cinturones" | "peleas";

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

const INIT_USER_FORM = {
  displayName: "",
  email: "",
  password: "",
  phone: "",
  roles: ["alumno"] as string[],
  subscriptionLevel: "basico",
  isFighter: false,
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
        });
        onSaved({ ...res.user, roles: form.roles });
      } else if (initialData) {
        const payload: Parameters<typeof adminApi.updateUser>[1] = {
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          isFighter: form.isFighter,
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
    Alert.alert(
      "Eliminar Usuario",
      `¿Eliminar a "${user.displayName}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await adminApi.deleteUser(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              setExpandedUser(null);
            } catch (e: unknown) {
              Alert.alert("Error", e instanceof Error ? e.message : "No se pudo eliminar");
            }
          },
        },
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

                <View style={styles.userActionRow}>
                  <Pressable
                    style={styles.editUserBtn}
                    onPress={() => openEdit(u)}
                  >
                    <Ionicons name="pencil" size={14} color="#D4AF37" />
                    <Text style={styles.editUserBtnText}>Editar</Text>
                  </Pressable>
                  {!isCurrentUser && (
                    <Pressable
                      style={styles.deleteUserBtn}
                      onPress={() => handleDelete(u)}
                    >
                      <Ionicons name="trash" size={14} color="#FF4444" />
                      <Text style={styles.deleteUserBtnText}>Eliminar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

const INIT_BELT_FORM = { visible: false, editingId: null as number | null, beltName: "", description: "" };
const INIT_REQ_FORM = { visible: false, beltId: null as number | null, editingId: null as number | null, title: "", description: "" };

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
          description: beltForm.description.trim() || undefined,
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
            description: reqForm.description.trim() || undefined,
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

          return (
            <View key={disc.discipline} style={styles.catalogSection}>
              <Pressable
                style={styles.catalogDiscHeader}
                onPress={() => setExpandedDisc(isDiscOpen ? null : disc.discipline)}
              >
                <View style={styles.catalogDiscLeft}>
                  <MaterialCommunityIcons
                    name={disc.discipline === "ninjutsu" ? "star-four-points" : "feather"}
                    size={16}
                    color="#D4AF37"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.catalogDiscTitle}>{discLabel}</Text>
                  <View style={styles.catalogBeltCount}>
                    <Text style={styles.catalogBeltCountText}>{disc.belts.length}</Text>
                  </View>
                </View>
                <Ionicons name={isDiscOpen ? "chevron-up" : "chevron-down"} size={18} color="#555" />
              </Pressable>

              {isDiscOpen && (
                <View style={styles.catalogDiscContent}>
                  {disc.belts.length === 0 && (
                    <Text style={styles.noHistoryText}>Sin cinturones. Agrega el primero.</Text>
                  )}

                  {disc.belts.map((belt, beltIdx) => {
                    const isBeltOpen = expandedBelt === belt.id;
                    const isEditingBelt = beltForm.visible && beltForm.editingId === belt.id;
                    const isAddingReq = reqForm.visible && reqForm.beltId === belt.id && !reqForm.editingId;
                    const beltBarColor =
                      belt.color === "#FFFFFF" ? "#CCCCCC"
                      : belt.color === "#000000" ? "#333333"
                      : belt.color;

                    return (
                      <View key={belt.id} style={styles.catalogBeltItem}>
                        <Pressable
                          style={styles.catalogBeltHeader}
                          onPress={() => setExpandedBelt(isBeltOpen ? null : belt.id)}
                        >
                          <View style={[styles.catalogBeltColorBar, { backgroundColor: beltBarColor }]} />
                          <Text style={styles.catalogBeltName} numberOfLines={1}>{belt.name}</Text>
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
                              <Ionicons name="pencil" size={16} color="#D4AF37" />
                            </Pressable>
                            <Ionicons
                              name={isBeltOpen ? "chevron-up" : "chevron-down"}
                              size={16}
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

                            <Text style={styles.sectionLabel}>REQUERIMIENTOS</Text>

                            {belt.requirements.length === 0 && (
                              <Text style={styles.noHistoryText}>Sin requerimientos.</Text>
                            )}

                            {belt.requirements.map((req) => {
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
                                      <View style={styles.catalogReqDot} />
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [fights, setFights] = useState<FightData[]>([]);
  const [stats, setStats] = useState<FightStats | null>(null);
  const [fighterName, setFighterName] = useState("");
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

  const fighters = users.filter((u) => u.isFighter);

  const loadFights = async (userId: number) => {
    setLoadingFights(true);
    try {
      const data = await fightsApi.getUserFights(userId);
      setFights(data.fights);
      setStats(data.stats);
      setFighterName(data.fighter.displayName);
    } catch {
      Alert.alert("Error", "No se pudo cargar el historial");
    } finally {
      setLoadingFights(false);
    }
  };

  const toggleFighterMode = async (userId: number, enable: boolean) => {
    const key = `fighter-${userId}`;
    setActionLoading(key);
    try {
      await fightsApi.toggleFighterMode(userId, enable);
      await onRefreshUsers();
      if (!enable && selectedUserId === userId) {
        setSelectedUserId(null);
        setFights([]);
        setStats(null);
      }
      Alert.alert("Éxito", enable ? "Modo peleador activado" : "Modo peleador desactivado");
    } catch {
      Alert.alert("Error", "No se pudo cambiar el modo peleador");
    } finally {
      setActionLoading(null);
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
    if (!selectedUserId || !formOpponent.trim() || !formDate.trim()) {
      Alert.alert("Error", "Se requiere oponente y fecha");
      return;
    }
    setActionLoading("add-fight");
    try {
      const data: AddFightData = {
        userId: selectedUserId,
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
      await loadFights(selectedUserId);
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
            if (selectedUserId) await loadFights(selectedUserId);
          } catch {
            Alert.alert("Error", "No se pudo eliminar la pelea");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>ACTIVAR MODO PELEADOR</Text>
      {users.map((u) => (
        <View key={u.id} style={styles.fighterToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{u.displayName}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
          </View>
          <Pressable
            style={[
              styles.toggleButton,
              u.isFighter && styles.toggleButtonGold,
            ]}
            onPress={() => toggleFighterMode(u.id, !u.isFighter)}
            disabled={actionLoading === `fighter-${u.id}`}
          >
            {actionLoading === `fighter-${u.id}` ? (
              <ActivityIndicator size="small" color={u.isFighter ? "#000" : "#888"} />
            ) : (
              <Text style={[styles.toggleText, u.isFighter && styles.toggleTextActive]}>
                {u.isFighter ? "Activo" : "Inactivo"}
              </Text>
            )}
          </Pressable>
        </View>
      ))}

      <View style={styles.sectionDivider} />
      <Text style={styles.sectionLabel}>HISTORIAL DE PELEAS</Text>

      {fighters.length === 0 ? (
        <Text style={styles.noHistoryText}>No hay peleadores activos</Text>
      ) : (
        <>
          <View style={styles.toggleGroup}>
            {fighters.map((f) => (
              <Pressable
                key={f.id}
                style={[
                  styles.toggleButton,
                  selectedUserId === f.id && styles.toggleButtonActive,
                ]}
                onPress={() => {
                  setSelectedUserId(f.id);
                  loadFights(f.id);
                }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    selectedUserId === f.id && styles.toggleTextActive,
                  ]}
                >
                  {f.displayName}
                </Text>
              </Pressable>
            ))}
          </View>

          {selectedUserId && loadingFights && (
            <ActivityIndicator color="#D4AF37" style={{ marginVertical: 20 }} />
          )}

          {selectedUserId && !loadingFights && stats && (
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
                style={styles.beltActionButton}
                onPress={() => setShowForm(!showForm)}
              >
                <MaterialCommunityIcons
                  name={showForm ? "close" : "plus-circle"}
                  size={14}
                  color="#D4AF37"
                />
                <Text style={styles.beltActionText}>
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
                    style={[styles.beltPromoteButton, { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: "center", marginTop: 8 }]}
                    onPress={handleAddFight}
                    disabled={actionLoading === "add-fight"}
                  >
                    {actionLoading === "add-fight" ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.beltPromoteText}>Registrar Pelea</Text>
                    )}
                  </Pressable>
                </View>
              )}

              <View style={styles.sectionDivider} />
              {fights.length === 0 ? (
                <Text style={styles.noHistoryText}>Sin peleas registradas</Text>
              ) : (
                fights.map((fight) => {
                  const resultColor =
                    fight.result === "victoria" ? "#22C55E" :
                    fight.result === "derrota" ? "#EF4444" : "#F59E0B";
                  const dateStr = new Date(fight.fightDate).toLocaleDateString("es-MX", {
                    year: "numeric", month: "short", day: "numeric",
                  });
                  return (
                    <View key={fight.id} style={styles.fightAdminCard}>
                      <View style={styles.fightAdminHeader}>
                        <View style={[styles.fightResultDot, { backgroundColor: resultColor }]} />
                        <Text style={styles.fightAdminResult}>
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
                      <Text style={styles.historyDate}>
                        {dateStr} · {FIGHT_DISCIPLINE_OPTIONS.find((d) => d.value === fight.discipline)?.label || fight.discipline}
                        {fight.method ? ` · ${FIGHT_METHOD_OPTIONS.find((m) => m.value === fight.method)?.label || fight.method}` : ""}
                      </Text>
                      {fight.eventName && (
                        <Text style={styles.historyNotes}>{fight.eventName}</Text>
                      )}
                    </View>
                  );
                })
              )}
            </>
          )}
        </>
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
              name="medal"
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
        ) : (
          <FightsPanel users={users} onRefreshUsers={async () => {
            const res = await adminApi.getUsers();
            setUsers(res.users);
          }} />
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
    fontSize: 11,
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    overflow: "hidden",
  },
  catalogDiscHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  catalogDiscLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  catalogDiscTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  catalogBeltCount: {
    backgroundColor: "#1A1500",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  catalogBeltCountText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#D4AF37",
  },
  catalogDiscContent: {
    backgroundColor: "#050505",
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 4,
  },
  catalogBeltItem: {
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 8,
    marginBottom: 6,
    overflow: "hidden",
  },
  catalogBeltHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#0D0D0D",
  },
  catalogBeltColorBar: {
    width: 5,
    height: 28,
    borderRadius: 3,
  },
  catalogBeltName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#DDD",
    flex: 1,
  },
  catalogBeltActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catalogIconBtn: {
    padding: 4,
  },
  catalogBeltContent: {
    backgroundColor: "#080808",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  catalogBeltDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#555",
    fontStyle: "italic",
    marginBottom: 4,
  },
  catalogReqItem: {
    marginBottom: 4,
  },
  catalogReqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  catalogReqDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D4AF37",
    marginTop: 6,
  },
  catalogReqTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#CCC",
  },
  catalogReqDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#555",
  },
  catalogForm: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    gap: 8,
  },
  catalogFormTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#D4AF37",
    letterSpacing: 1,
    marginBottom: 2,
  },
  catalogFormInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 6,
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
    backgroundColor: "#1A1A1A",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#222",
  },
  catalogFormCancelText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#666",
  },
  catalogFormSave: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#D4AF37",
    borderRadius: 6,
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
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1A1A1A",
  },
  editUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D4AF37",
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  editUserBtnText: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  deleteUserBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#FF4444",
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  deleteUserBtnText: {
    color: "#FF4444",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
});
