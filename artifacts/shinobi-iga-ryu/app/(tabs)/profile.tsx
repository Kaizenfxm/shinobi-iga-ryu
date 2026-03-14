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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi, avatarApi, getAvatarServingUrl, type ProfileData, type ProfileBelt, type FightStats, type UserData } from "@/lib/api";
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

function FightRecord({ stats }: { stats: FightStats }) {
  return (
    <View style={fightStyles.container}>
      <View style={fightStyles.header}>
        <View style={fightStyles.headerLine} />
        <Text style={fightStyles.headerTitle}>戦 RECORD 戦</Text>
        <View style={fightStyles.headerLine} />
      </View>
      <View style={fightStyles.recordRow}>
        <View style={fightStyles.statItem}>
          <Text style={[fightStyles.statNumber, { color: "#22C55E" }]}>
            {stats.victorias}
          </Text>
          <Text style={fightStyles.statLabel}>V</Text>
        </View>
        <Text style={fightStyles.separator}>-</Text>
        <View style={fightStyles.statItem}>
          <Text style={[fightStyles.statNumber, { color: "#EF4444" }]}>
            {stats.derrotas}
          </Text>
          <Text style={fightStyles.statLabel}>D</Text>
        </View>
        <Text style={fightStyles.separator}>-</Text>
        <View style={fightStyles.statItem}>
          <Text style={[fightStyles.statNumber, { color: "#F59E0B" }]}>
            {stats.empates}
          </Text>
          <Text style={fightStyles.statLabel}>E</Text>
        </View>
      </View>
      <View style={fightStyles.totalRow}>
        <Text style={fightStyles.totalLabel}>{stats.total} peleas</Text>
        <View style={fightStyles.winRateContainer}>
          <View style={fightStyles.winRateBarBg}>
            <View
              style={[
                fightStyles.winRateBarFill,
                { width: `${stats.winPercentage}%` },
              ]}
            />
          </View>
          <Text style={fightStyles.winRateText}>{stats.winPercentage}%</Text>
        </View>
      </View>
    </View>
  );
}

const fightStyles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D4AF37",
    opacity: 0.3,
  },
  headerTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 16,
    color: "#D4AF37",
    letterSpacing: 4,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    minWidth: 50,
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    lineHeight: 40,
  },
  statLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#666",
    letterSpacing: 2,
    marginTop: 4,
  },
  separator: {
    fontFamily: "Inter_400Regular",
    fontSize: 28,
    color: "#333",
    marginTop: -8,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
  },
  totalLabel: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#555",
  },
  winRateContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  winRateBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: "#1A1A1A",
    borderRadius: 2,
    overflow: "hidden",
  },
  winRateBarFill: {
    height: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: 2,
  },
  winRateText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: "#D4AF37",
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
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [togglingFighter, setTogglingFighter] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

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

  const handleEditOpen = () => {
    setEditName(profile?.displayName ?? user?.displayName ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditing(true);
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
    setSaving(true);
    try {
      await profileApi.updateProfile({
        displayName: editName.trim(),
        phone: editPhone.trim() || null,
      });
      setProfile((prev) =>
        prev ? { ...prev, displayName: editName.trim(), phone: editPhone.trim() || null } : prev
      );
      setEditing(false);
    } catch {
      Alert.alert("Error", "No se pudo guardar el perfil");
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
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
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
      <ScrollView
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
              <Image
                source={require("@/assets/images/logo.png")}
                style={styles.headerLogo}
                resizeMode="contain"
              />
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
              {data.isFighter && (
                <View style={styles.fighterPill}>
                  <MaterialCommunityIcons name="sword-cross" size={12} color="#D4AF37" />
                  <Text style={styles.fighterPillText}>Peleador</Text>
                </View>
              )}
            </View>
          {data.phone ? (
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={14} color="#888" />
              <Text style={styles.phoneText}>{data.phone}</Text>
            </View>
          ) : null}
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

          <View style={styles.footerBranding}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>伊賀流</Text>
            <View style={styles.footerLine} />
          </View>
        </ViewShot>

        <View style={styles.actionsSection}>
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

          <Pressable
            style={[styles.fighterToggleButton, data.isFighter && styles.fighterToggleButtonActive]}
            onPress={handleToggleFighter}
            disabled={togglingFighter}
          >
            {togglingFighter ? (
              <ActivityIndicator size="small" color={data.isFighter ? "#000" : "#D4AF37"} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={16}
                  color={data.isFighter ? "#000" : "#D4AF37"}
                />
                <Text style={[styles.fighterToggleText, data.isFighter && styles.fighterToggleTextActive]}>
                  {data.isFighter ? "Desactivar modo peleador" : "Activar modo peleador"}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.shareButton}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
              <>
                <Ionicons name="share-outline" size={18} color="#D4AF37" />
                <Text style={styles.shareButtonText}>Compartir Perfil</Text>
              </>
            )}
          </Pressable>

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
  fighterPillText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 1,
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
  fighterToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#D4AF3750",
    borderRadius: 12,
    marginBottom: 10,
  },
  fighterToggleButtonActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  fighterToggleText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#D4AF37",
    letterSpacing: 1,
  },
  fighterToggleTextActive: {
    color: "#000000",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#0A0800",
    borderWidth: 1,
    borderColor: "#332A00",
    borderRadius: 12,
  },
  shareButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#D4AF37",
    letterSpacing: 1,
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
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  phoneText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#888",
    letterSpacing: 0.5,
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
