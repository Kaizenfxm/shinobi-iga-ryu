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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi, type ProfileData, type ProfileBelt, type FightStats } from "@/lib/api";
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
  const isBlack = belt.beltColor === "#000000";
  const isWhite = belt.beltColor === "#FFFFFF";
  const borderColor = isBlack ? "#333" : isWhite ? "#555" : belt.beltColor;
  const displayColor = isWhite ? "#AAA" : belt.beltColor;

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
            {
              backgroundColor: belt.beltColor,
              borderColor,
              borderWidth: 1,
            },
          ]}
        >
          <View style={beltCardStyles.beltKnot}>
            <View style={[beltCardStyles.knotLine, { backgroundColor: borderColor }]} />
          </View>
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
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    minWidth: 140,
  },
  kanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 28,
    color: "#D4AF37",
    marginBottom: 4,
  },
  disciplineName: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#666",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  beltVisual: {
    width: 120,
    height: 28,
    marginBottom: 10,
  },
  beltStrip: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  beltKnot: {
    position: "absolute",
    right: "45%",
    top: "20%",
    bottom: "20%",
    width: 3,
  },
  knotLine: {
    flex: 1,
    width: 3,
    borderRadius: 1,
  },
  beltName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    letterSpacing: 2,
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
  const { user, logout, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert("Error", "No se pudo cerrar la sesión");
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
                {data.avatarUrl ? (
                  <Image
                    source={{ uri: data.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={48} color="#666" />
                )}
              </View>
              <View style={styles.avatarBorder} />
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
});
