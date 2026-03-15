import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { settingsApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 12;
const SIDE_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - SIDE_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.9;

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) return shortMatch[1];
  const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (longMatch) return longMatch[1];
  return null;
}

function getThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function buildWhatsAppUrl(phone: string, sede: string, displayName: string | null | undefined): string {
  const firstName = displayName ? displayName.split(" ")[0] : "[tu nombre]";
  const msg = `Hola! Mi nombre es ${firstName}, y quiero info de la academia, me interesa la sede de ${sede}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

interface Settings {
  whatsappAdminNumber: string;
  bogotaVideoUrl: string;
  chiaVideoUrl: string;
  bogotaAddress: string;
  chiaAddress: string;
}

interface SedeCardProps {
  sedeName: string;
  videoUrl: string;
  address: string;
  whatsappPhone: string;
  displayName?: string | null;
}

function SedeCard({ sedeName, videoUrl, address, whatsappPhone, displayName }: SedeCardProps) {
  const thumbnail = getThumbnail(videoUrl);
  const hasVideo = !!videoUrl;
  const hasWhatsApp = !!whatsappPhone;

  const openVideo = () => {
    if (videoUrl) Linking.openURL(videoUrl);
  };

  const openWhatsApp = () => {
    if (!whatsappPhone) return;
    const url = buildWhatsAppUrl(whatsappPhone, sedeName, displayName);
    Linking.openURL(url);
  };

  return (
    <View style={[cardStyles.card, { width: CARD_WIDTH, minHeight: CARD_HEIGHT }]}>
      <View style={cardStyles.goldTopBorder} />

      <Text style={cardStyles.sedeName}>{sedeName.toUpperCase()}</Text>

      <Pressable
        style={cardStyles.videoContainer}
        onPress={hasVideo ? openVideo : undefined}
        disabled={!hasVideo}
      >
        {thumbnail ? (
          <>
            <Image
              source={{ uri: thumbnail }}
              style={cardStyles.thumbnail}
              resizeMode="cover"
            />
            <View style={cardStyles.playOverlay}>
              <View style={cardStyles.playBtn}>
                <Ionicons name="play" size={20} color="#000" />
              </View>
            </View>
          </>
        ) : (
          <View style={cardStyles.noVideoBox}>
            <Ionicons name="videocam-outline" size={28} color="#333" />
            <Text style={cardStyles.noVideoText}>Sin video</Text>
          </View>
        )}
      </Pressable>

      <View style={cardStyles.infoSection}>
        {address ? (
          <View style={cardStyles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#D4AF37" />
            <Text style={cardStyles.addressText}>{address}</Text>
          </View>
        ) : (
          <View style={cardStyles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#333" />
            <Text style={[cardStyles.addressText, { color: "#333" }]}>Sin dirección</Text>
          </View>
        )}
      </View>

      <Pressable
        style={[cardStyles.waBtn, !hasWhatsApp && { opacity: 0.3 }]}
        onPress={openWhatsApp}
        disabled={!hasWhatsApp}
      >
        <MaterialCommunityIcons name="whatsapp" size={14} color="#000" />
        <Text style={cardStyles.waBtnText}>Escribir</Text>
      </Pressable>
    </View>
  );
}

export default function ConocenosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi
      .getPublic()
      .then((s) =>
        setSettings({
          whatsappAdminNumber: s.whatsappAdminNumber,
          bogotaVideoUrl: s.bogotaVideoUrl,
          chiaVideoUrl: s.chiaVideoUrl,
          bogotaAddress: s.bogotaAddress,
          chiaAddress: s.chiaAddress,
        })
      )
      .catch(() => setSettings({ whatsappAdminNumber: "", bogotaVideoUrl: "", chiaVideoUrl: "", bogotaAddress: "", chiaAddress: "" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#D4AF37" />
        </Pressable>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>CONÓCENOS</Text>
        <Text style={styles.subtitle}>忍  Shinobi Iga Ryu  忍</Text>
        <View style={styles.goldLine} />

        {loading ? (
          <ActivityIndicator color="#D4AF37" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.cardsRow}>
            <SedeCard
              sedeName="Bogotá"
              videoUrl={settings?.bogotaVideoUrl || ""}
              address={settings?.bogotaAddress || ""}
              whatsappPhone={settings?.whatsappAdminNumber || ""}
              displayName={user?.displayName}
            />
            <SedeCard
              sedeName="Chía"
              videoUrl={settings?.chiaVideoUrl || ""}
              address={settings?.chiaAddress || ""}
              whatsappPhone={settings?.whatsappAdminNumber || ""}
              displayName={user?.displayName}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogo: {
    width: 48,
    height: 48,
  },
  content: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 40,
    alignItems: "center",
  },
  title: {
    color: "#FFF",
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 22,
    letterSpacing: 4,
    marginTop: 28,
    textAlign: "center",
  },
  subtitle: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 6,
    textAlign: "center",
  },
  goldLine: {
    width: 60,
    height: 1,
    backgroundColor: "#D4AF37",
    marginTop: 16,
    marginBottom: 28,
  },
  cardsRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    alignSelf: "stretch",
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 2,
    overflow: "hidden",
    flex: 1,
  },
  goldTopBorder: {
    height: 2,
    backgroundColor: "#D4AF37",
  },
  sedeName: {
    color: "#FFF",
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 13,
    letterSpacing: 3,
    textAlign: "center",
    paddingVertical: 12,
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#111",
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  noVideoBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  noVideoText: {
    color: "#333",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
  },
  infoSection: {
    paddingHorizontal: 10,
    paddingTop: 10,
    flex: 1,
  },
  addressRow: {
    flexDirection: "row",
    gap: 5,
    alignItems: "flex-start",
  },
  addressText: {
    color: "#AAA",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    flex: 1,
    lineHeight: 15,
  },
  waBtn: {
    margin: 10,
    backgroundColor: "#25D366",
    borderRadius: 2,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  waBtnText: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
});
