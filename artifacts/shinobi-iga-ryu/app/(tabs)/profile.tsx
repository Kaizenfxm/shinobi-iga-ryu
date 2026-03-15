import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi, avatarApi, settingsApi, getAvatarServingUrl, type ProfileData, type ProfileBelt, type UserData, type WeightData } from "@/lib/api";
import FightRecord from "@/components/FightRecord";
import { useMembership } from "@/hooks/useMembership";
import * as ImagePicker from "expo-image-picker";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  profesor: "Profesor",
  alumno: "Alumno",
};

const DISCIPLINE_LABELS: Record<string, string> = {
  ninjutsu: "Ninjutsu",
  jiujitsu: "Jiujitsu",
};

const DISCIPLINE_KANJI: Record<string, string> = {
  ninjutsu: "忍術",
  jiujitsu: "柔術",
};

function BeltCard({ belt }: { belt: ProfileBelt }) {
  const nameLower = belt.beltName.toLowerCase();
  const colorLower = belt.beltColor.toLowerCase();
  const isVeryDark = colorLower === "#000000" || colorLower === "#1c1c1c" || colorLower === "#212121";
  const isWhite = colorLower === "#ffffff";
  const isPuntaNegra = nameLower.includes("punta negra");
  const isFranjaRoja = nameLower.includes("franja roja");

  const borderColor = isVeryDark ? "#3a3a3a" : isWhite ? "#bbb" : belt.beltColor;
  const displayColor = isWhite ? "#AAA" : belt.beltColor;
  const showKnot = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja;
  const showEnd = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja;

  return (
    <View style={beltCardStyles.container}>
      <Text style={beltCardStyles.kanji}>
        {DISCIPLINE_KANJI[belt.discipline] || belt.discipline}
      </Text>
      <Text style={beltCardStyles.disciplineName}>
        {DISCIPLINE_LABELS[belt.discipline] || belt.discipline}
      </Text>
      <View style={beltCardStyles.beltVisual}>
        <View
          style={[
            beltCardStyles.beltStrip,
            { backgroundColor: belt.beltColor, borderColor, borderWidth: 1 },
          ]}
        >
          {showKnot && (
            <View style={[beltCardStyles.knot, { backgroundColor: borderColor }]} />
          )}
          {showEnd && (
            <View style={[beltCardStyles.end, { backgroundColor: borderColor + "40" }]} />
          )}
          {isFranjaRoja && <View style={beltCardStyles.franjaRoja} />}
          {isPuntaNegra && <View style={beltCardStyles.puntaNegra} />}
        </View>
      </View>
      <Text style={[beltCardStyles.beltName, { color: displayColor }]}>
        {belt.beltName}
      </Text>
    </View>
  );
}

const beltCardStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minWidth: 0,
  },
  kanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 18,
    color: "#D4AF37",
    marginBottom: 2,
  },
  disciplineName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 8,
    color: "#666",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  beltVisual: {
    width: 80,
    height: 18,
    marginBottom: 6,
  },
  beltStrip: {
    width: "100%",
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
    position: "relative",
  },
  knot: {
    position: "absolute",
    left: "44%",
    top: "15%",
    bottom: "15%",
    width: 2,
    borderRadius: 1,
  },
  end: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "20%",
  },
  franjaRoja: {
    position: "absolute",
    left: "38%",
    width: "20%",
    top: 0,
    bottom: 0,
    backgroundColor: "#CC0000",
  },
  puntaNegra: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "30%",
    backgroundColor: "#000000",
  },
  beltName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSedes, setEditSedes] = useState<string[]>([]);
  const [editCurrentPassword, setEditCurrentPassword] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [togglingFighter, setTogglingFighter] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);
  const scrollRef = useRef<ScrollView>(null);
  const actionsSectionYRef = useRef(0);

  const { isAlumno, status: membershipStatus, expiresAt: membershipExpiresAt, daysRemaining } = useMembership();
  const [pubSettings, setPubSettings] = useState<{ whatsappAdminNumber: string; paymentLinkUrl: string } | null>(null);

  useEffect(() => {
    if (isAlumno && isAuthenticated) {
      settingsApi.getPublic().then(setPubSettings).catch(() => {});
    }
  }, [isAlumno, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated, authLoading]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileApi.getMyProfile();
      setProfile(res.profile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile]);

  const handleToggleFighter = async () => {
    if (!profile && !user) return;
    const current = profile?.isFighter ?? false;
    setTogglingFighter(true);
    try {
      const res = await profileApi.toggleFighterMode(!current);
      setProfile((prev) => prev ? { ...prev, isFighter: res.isFighter } : prev);
    } catch {
      Alert.alert("Error", "No se pudo actualizar el modo peleador");
    } finally {
      setTogglingFighter(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert("Error", "No se pudo cerrar la sesión");
    }
  };

  const toggleEditSede = (sede: string) => {
    setEditSedes((prev) =>
      prev.includes(sede) ? prev.filter((s) => s !== sede) : [...prev, sede]
    );
  };

  const handleEditOpen = () => {
    setEditName(profile?.displayName ?? user?.displayName ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditSedes(profile?.sedes ?? []);
    setEditCurrentPassword("");
    setEditNewPassword("");
    setEditConfirmPassword("");
    setEditing(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: actionsSectionYRef.current, animated: true });
    }, 80);
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para cambiar la foto");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      const mimeType = asset.mimeType ?? "image/jpeg";

      setUploadingAvatar(true);
      const { uploadURL, objectPath } = await avatarApi.getUploadUrl(mimeType);

      const imageBlob = await fetch(asset.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: imageBlob,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      await avatarApi.saveAvatar(objectPath);
      setProfile((prev) => prev ? { ...prev, avatarUrl: objectPath } : prev);
    } catch {
      Alert.alert("Error", "No se pudo subir la foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacío");
      return;
    }
    if (editSedes.length === 0) {
      Alert.alert("Error", "Selecciona al menos una sede");
      return;
    }
    if (editNewPassword) {
      if (!editCurrentPassword) {
        Alert.alert("Error", "Ingresa tu contraseña actual para cambiarla");
        return;
      }
      if (editNewPassword.length < 6) {
        Alert.alert("Error", "La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }
      if (editNewPassword !== editConfirmPassword) {
        Alert.alert("Error", "Las contraseñas nuevas no coinciden");
        return;
      }
    }
    setSaving(true);
    try {
      const payload: Parameters<typeof profileApi.updateProfile>[0] = {
        displayName: editName.trim(),
        phone: editPhone.trim() || null,
        sedes: editSedes,
      };
      if (editNewPassword) {
        payload.currentPassword = editCurrentPassword;
        payload.newPassword = editNewPassword;
      }
      await profileApi.updateProfile(payload);
      setProfile((prev) =>
        prev
          ? { ...prev, displayName: editName.trim(), phone: editPhone.trim() || null, sedes: editSedes }
          : prev
      );
      setEditing(false);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Info", "Compartir no está disponible en web");
      return;
    }
    setSharing(true);
    try {
      const uri = await captureRef(viewShotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Compartir Perfil",
        });
      } else {
        Alert.alert("Error", "Compartir no está disponible en este dispositivo");
      }
    } catch {
      Alert.alert("Error", "No se pudo capturar el perfil");
    } finally {
      setSharing(false);
    }
  };

  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w <= 0 || w > 500) {
      Alert.alert("Error", "Ingresa un peso válido en kg");
      return;
    }
    setSavingWeight(true);
    try {
      const res = await profileApi.updateWeight(w);
      setProfile((prev) => prev ? { ...prev, weightData: res.weightData } : prev);
      setEditingWeight(false);
      setWeightInput("");
    } catch {
      Alert.alert("Error", "No se pudo actualizar el peso");
    } finally {
      setSavingWeight(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View
          style={[styles.content, { paddingTop: (isWeb ? 67 : insets.top) + 24 }]}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="#444" />
            </View>
            <View style={styles.avatarBorder} />
          </View>
          <Text style={styles.name}>Ninja</Text>
          <Pressable onPress={() => router.push("/conocenos")}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.infoCard}>
            <Text style={styles.infoCardValue}>
              Inicia sesión para ver tu perfil completo
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  const data = profile || {
    ...user,
    belts: [] as ProfileBelt[],
    fightStats: null as FightStats | null,
  };
  const ninjutsuBelt = data.belts.find((b) => b.discipline === "ninjutsu");
  const jiujitsuBelt = data.belts.find((b) => b.discipline === "jiujitsu");
  const hasBelts = data.belts.length > 0;
  const hasFightRecord = data.isFighter && data.fightStats;

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.topShareBtn, { top: (isWeb ? 67 : insets.top) + 10 }]}
        onPress={handleShare}
        disabled={sharing}
      >
        {sharing ? (
          <ActivityIndicator size="small" color="#D4AF37" />
        ) : (
          <Ionicons name="share-social-outline" size={20} color="#D4AF37" />
        )}
      </Pressable>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: (isWeb ? 67 : insets.top) + 16, paddingBottom: 100 },
        ]}
      >
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1 }}
          style={styles.captureArea}
        >
          <View style={styles.headerSection}>
            <View style={styles.academyRow}>
              <Pressable onPress={() => router.push("/conocenos")}>
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
            <Text style={styles.academyName}>忍 SHINOBI IGA RYU 忍</Text>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {getAvatarServingUrl(data.avatarUrl) ? (
                  <Image
                    source={{ uri: getAvatarServingUrl(data.avatarUrl)! }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={48} color="#666" />
                )}
              </View>
              <View style={styles.avatarBorder} />
              <Pressable
                style={styles.avatarEditBadge}
                onPress={handleEditOpen}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="pencil" size={13} color="#000" />
                )}
              </Pressable>
            </View>

            <Text style={styles.name}>{data.displayName}</Text>

            <View style={styles.rolesRow}>
              {data.roles.map((role) => (
                <View key={role} style={styles.rolePill}>
                  <Text style={styles.rolePillText}>
                    {ROLE_LABELS[role] || role}
                  </Text>
                </View>
              ))}
              <Pressable
                style={[styles.fighterPill, !data.isFighter && styles.fighterPillInactive]}
                onPress={handleToggleFighter}
                disabled={togglingFighter}
              >
                {togglingFighter ? (
                  <ActivityIndicator size="small" color={data.isFighter ? "#D4AF37" : "#555"} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="sword-cross"
                      size={12}
                      color={data.isFighter ? "#D4AF37" : "#555"}
                    />
                    <Text style={[styles.fighterPillText, !data.isFighter && styles.fighterPillTextInactive]}>
                      {data.isFighter ? "Peleador" : "Entrenamiento"}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          {hasBelts && (
            <View style={styles.beltsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>帯 CINTURONES</Text>
                <View style={styles.sectionLine} />
              </View>
              <View style={styles.beltsRow}>
                {ninjutsuBelt && <BeltCard belt={ninjutsuBelt} />}
                {jiujitsuBelt && <BeltCard belt={jiujitsuBelt} />}
              </View>
            </View>
          )}

          {hasFightRecord && data.fightStats && (
            <View style={styles.fightSection}>
              <FightRecord stats={data.fightStats} />
            </View>
          )}

          {data.weightData && (data.weightData.currentWeight || data.weightData.initialWeight || data.weightData.targetWeight) && (
            <View style={weightStyles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>体重 PESO</Text>
                <View style={styles.sectionLine} />
              </View>
              <View style={weightStyles.card}>
                <View style={weightStyles.row}>
                  {data.weightData.initialWeight != null && (
                    <View style={weightStyles.item}>
                      <Text style={weightStyles.label}>INICIAL</Text>
                      <Text style={weightStyles.value}>{data.weightData.initialWeight}</Text>
                      <Text style={weightStyles.unit}>kg</Text>
                    </View>
                  )}
                  {data.weightData.currentWeight != null && (
                    <View style={weightStyles.item}>
                      <Text style={weightStyles.label}>ACTUAL</Text>
                      <Text style={[weightStyles.value, { color: "#D4AF37" }]}>{data.weightData.currentWeight}</Text>
                      <Text style={weightStyles.unit}>kg</Text>
                    </View>
                  )}
                  {data.weightData.targetWeight != null && (
                    <View style={weightStyles.item}>
                      <Text style={weightStyles.label}>META</Text>
                      <Text style={weightStyles.value}>{data.weightData.targetWeight}</Text>
                      <Text style={weightStyles.unit}>kg</Text>
                    </View>
                  )}
                </View>
                {data.weightData.initialWeight != null && data.weightData.currentWeight != null && data.weightData.targetWeight != null && data.weightData.initialWeight !== data.weightData.targetWeight && (
                  <View style={weightStyles.progressContainer}>
                    <View style={weightStyles.progressTrack}>
                      <View
                        style={[
                          weightStyles.progressFill,
                          {
                            width: `${Math.min(100, Math.max(0,
                              ((data.weightData.initialWeight - data.weightData.currentWeight) /
                              (data.weightData.initialWeight - data.weightData.targetWeight)) * 100
                            ))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={weightStyles.progressText}>
                      {data.weightData.currentWeight > data.weightData.initialWeight
                        ? `+${(data.weightData.currentWeight - data.weightData.initialWeight).toFixed(1)} kg`
                        : `${(data.weightData.currentWeight - data.weightData.initialWeight).toFixed(1)} kg`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <View style={styles.footerBranding}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>伊賀流</Text>
            <View style={styles.footerLine} />
          </View>
        </ViewShot>

        <View
          style={styles.actionsSection}
          onLayout={(e) => { actionsSectionYRef.current = e.nativeEvent.layout.y; }}
        >
          {editing && (
            <View style={styles.editForm}>
              <Text style={styles.editFormTitle}>Editar Perfil</Text>

              <Pressable
                style={styles.changePhotoButton}
                onPress={handlePickAvatar}
                disabled={uploadingAvatar || saving}
              >
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#D4AF37" />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={16} color="#D4AF37" />
                    <Text style={styles.changePhotoText}>Cambiar foto de perfil</Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.editLabel}>Nombre</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Tu nombre"
                placeholderTextColor="#444"
                autoCapitalize="words"
              />
              <Text style={styles.editLabel}>Teléfono (opcional)</Text>
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+57 300 000 0000"
                placeholderTextColor="#444"
                keyboardType="phone-pad"
              />

              <Text style={styles.editLabel}>Sedes</Text>
              <View style={styles.sedeRow}>
                {(["bogota", "chia"] as const).map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.sedeChip, editSedes.includes(s) && styles.sedeChipSelected]}
                    onPress={() => toggleEditSede(s)}
                    disabled={saving}
                  >
                    <Text style={[styles.sedeChipText, editSedes.includes(s) && styles.sedeChipTextSelected]}>
                      {s === "bogota" ? "Bogotá" : "Chía"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.editLabel, { marginTop: 12 }]}>Cambiar contraseña</Text>
              <Text style={{ color: "#555", fontSize: 11, fontFamily: "NotoSansJP_400Regular", marginBottom: 6 }}>
                Dejar vacío si no deseas cambiarla
              </Text>
              <TextInput
                style={styles.editInput}
                value={editCurrentPassword}
                onChangeText={setEditCurrentPassword}
                placeholder="Contraseña actual"
                placeholderTextColor="#444"
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={styles.editInput}
                value={editNewPassword}
                onChangeText={setEditNewPassword}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                placeholderTextColor="#444"
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={styles.editInput}
                value={editConfirmPassword}
                onChangeText={setEditConfirmPassword}
                placeholder="Confirmar nueva contraseña"
                placeholderTextColor="#444"
                secureTextEntry
                autoCapitalize="none"
              />

              <View style={styles.editActions}>
                <Pressable
                  style={styles.editCancelButton}
                  onPress={() => setEditing(false)}
                  disabled={saving}
                >
                  <Text style={styles.editCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.editSaveButton}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.editSaveText}>Guardar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}

          <View style={weightStyles.editSection}>
            <Pressable
              style={weightStyles.editToggle}
              onPress={() => {
                if (editingWeight) {
                  setEditingWeight(false);
                  setWeightInput("");
                } else {
                  setWeightInput(data.weightData?.currentWeight?.toString() ?? "");
                  setEditingWeight(true);
                }
              }}
            >
              <MaterialCommunityIcons name="scale-bathroom" size={16} color="#D4AF37" />
              <Text style={weightStyles.editToggleText}>ACTUALIZAR PESO</Text>
              <Ionicons name={editingWeight ? "chevron-up" : "chevron-down"} size={16} color="#666" />
            </Pressable>
            {editingWeight && (
              <View style={weightStyles.editForm}>
                <Text style={weightStyles.editLabel}>Peso actual (kg)</Text>
                <View style={weightStyles.editRow}>
                  <TextInput
                    style={weightStyles.editInput}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    placeholder="Ej: 72.5"
                    placeholderTextColor="#444"
                    keyboardType="decimal-pad"
                    editable={!savingWeight}
                  />
                  <Pressable
                    style={[weightStyles.editSaveBtn, savingWeight && { opacity: 0.6 }]}
                    onPress={handleSaveWeight}
                    disabled={savingWeight}
                  >
                    {savingWeight ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={weightStyles.editSaveBtnText}>Guardar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {isAlumno && (
            <View style={membershipStyles.section}>
              <View style={membershipStyles.header}>
                <MaterialCommunityIcons name="shield-account-outline" size={16} color="#D4AF37" />
                <Text style={membershipStyles.title}>MI MEMBRESÍA</Text>
              </View>

              <View style={membershipStyles.row}>
                <View style={[
                  membershipStyles.statusBadge,
                  membershipStatus === "activo" ? membershipStyles.statusActivo
                  : membershipStatus === "pausado" ? membershipStyles.statusPausado
                  : membershipStyles.statusInactivo
                ]}>
                  <Text style={membershipStyles.statusText}>
                    {membershipStatus === "activo" ? "Activo"
                    : membershipStatus === "pausado" ? "Pausado"
                    : "Inactivo"}
                  </Text>
                </View>

                {membershipExpiresAt && (
                  <Text style={membershipStyles.expiryText}>
                    Vence {membershipExpiresAt.toLocaleDateString("es-CO")}
                    {daysRemaining !== null && daysRemaining <= 7 && (
                      <Text style={membershipStyles.urgentText}> · {daysRemaining}d restantes</Text>
                    )}
                  </Text>
                )}
              </View>

              <View style={membershipStyles.actions}>
                {pubSettings?.whatsappAdminNumber ? (
                  <Pressable
                    style={membershipStyles.whatsappBtn}
                    onPress={() => {
                      const msg = encodeURIComponent("Hola! Quiero renovar mi membresía en Shinobi Iga Ryu.");
                      Linking.openURL(`https://wa.me/${pubSettings.whatsappAdminNumber}?text=${msg}`);
                    }}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={16} color="#25D366" />
                    <Text style={membershipStyles.whatsappBtnText}>Enviar comprobante</Text>
                  </Pressable>
                ) : null}

                {pubSettings?.paymentLinkUrl ? (
                  <Pressable
                    style={membershipStyles.payBtn}
                    onPress={() => Linking.openURL(pubSettings.paymentLinkUrl)}
                  >
                    <MaterialCommunityIcons name="credit-card-outline" size={16} color="#000" />
                    <Text style={membershipStyles.payBtnText}>Pagar en línea</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#FF4444" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topShareBtn: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
  },
  captureArea: {
    backgroundColor: "#000000",
    paddingBottom: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  academyRow: {
    alignItems: "center",
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  academyName: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 6,
    marginTop: 4,
    opacity: 0.7,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 14,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D4AF37",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
    zIndex: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 100,
    height: 100,
  },
  avatarBorder: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: "#D4AF37",
    opacity: 0.5,
  },
  name: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: 4,
    textAlign: "center",
  },
  rolesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rolePill: {
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rolePillText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#999",
    letterSpacing: 1,
  },
  fighterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1A1500",
    borderWidth: 1,
    borderColor: "#332A00",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  fighterPillInactive: {
    backgroundColor: "#111",
    borderColor: "#2A2A2A",
  },
  fighterPillText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  fighterPillTextInactive: {
    color: "#555",
  },
  beltsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222",
  },
  sectionTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 13,
    color: "#888",
    letterSpacing: 4,
  },
  beltsRow: {
    flexDirection: "row",
    gap: 12,
  },
  fightSection: {
    marginBottom: 20,
  },
  footerBranding: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1A1A1A",
  },
  footerText: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 14,
    color: "#222",
    letterSpacing: 8,
  },
  actionsSection: {
    marginTop: 24,
    gap: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#0A0000",
    borderWidth: 1,
    borderColor: "#330000",
    borderRadius: 12,
  },
  logoutText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#FF4444",
    letterSpacing: 1,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "#222222",
    marginVertical: 24,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  infoCardValue: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    backgroundColor: "#0A0800",
    borderWidth: 1,
    borderColor: "#2A2500",
    borderRadius: 8,
  },
  changePhotoText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#D4AF37",
    letterSpacing: 0.5,
  },
  editForm: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  editFormTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 15,
    color: "#D4AF37",
    letterSpacing: 2,
    marginBottom: 4,
  },
  editLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  editInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
  },
  sedeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  sedeChip: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 2,
    alignItems: "center",
    backgroundColor: "#0A0A0A",
  },
  sedeChipSelected: {
    borderColor: "#D4AF37",
    backgroundColor: "#1A1600",
  },
  sedeChipText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#555",
  },
  sedeChipTextSelected: {
    color: "#D4AF37",
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 8,
    alignItems: "center",
  },
  editCancelText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#888",
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 11,
    backgroundColor: "#D4AF37",
    borderRadius: 8,
    alignItems: "center",
  },
  editSaveText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#000",
    letterSpacing: 1,
  },
});

const membershipStyles = StyleSheet.create({
  section: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderTopColor: "#D4AF3740",
    borderTopWidth: 2,
    borderRadius: 2,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  statusActivo: { backgroundColor: "#1a5c1a" },
  statusInactivo: { backgroundColor: "#5c1a1a" },
  statusPausado: { backgroundColor: "#5c4a1a" },
  statusText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#FFF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  expiryText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#888",
  },
  urgentText: {
    fontFamily: "NotoSansJP_700Bold",
    color: "#D4AF37",
  },
  actions: {
    gap: 8,
  },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0D1F0D",
    borderWidth: 1,
    borderColor: "#25D36640",
    borderRadius: 2,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  whatsappBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#25D366",
    letterSpacing: 0.5,
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  payBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#000",
    letterSpacing: 0.5,
  },
});

const weightStyles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
  },
  item: {
    alignItems: "center",
  },
  label: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 9,
    color: "#666",
    letterSpacing: 2,
    marginBottom: 4,
  },
  value: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 22,
    color: "#FFF",
  },
  unit: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#555",
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#888",
    marginTop: 6,
  },
  editSection: {
    marginBottom: 12,
  },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  editToggleText: {
    flex: 1,
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 2,
  },
  editForm: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderTopWidth: 0,
    borderRadius: 2,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 14,
  },
  editLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#888",
    letterSpacing: 1,
    marginBottom: 6,
  },
  editRow: {
    flexDirection: "row",
    gap: 10,
  },
  editInput: {
    flex: 1,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
  },
  editSaveBtn: {
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  editSaveBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#000",
    letterSpacing: 1,
  },
});
