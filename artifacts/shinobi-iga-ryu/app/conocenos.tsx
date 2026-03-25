import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
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
const H_PAD = 16;
const GAP = 10;
const CARD_W = (SCREEN_WIDTH - H_PAD * 2 - GAP) / 2;
const CARD_H = CARD_W * 2.0;

const SEDE_BG: Record<string, number> = {
  bogota: require("@/assets/images/arts/ninjutsu.jpg"),
  chia: require("@/assets/images/arts/jiujitsu.jpg"),
};

const SEDE_KANJI: Record<string, string> = {
  bogota: "武",
  chia: "忍",
};

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return short[1];
  const long = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (long) return long[1];
  return null;
}

function getThumbnail(url: string): string | null {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function openWhatsApp(phone: string, sede: string, displayName?: string | null) {
  const firstName = displayName ? displayName.split(" ")[0] : "[tu nombre]";
  const msg = `Hola! Mi nombre es ${firstName}, y quiero info de la academia, me interesa la sede de ${sede}`;
  Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
}

interface Settings {
  whatsappAdminNumber: string;
  bogotaVideoUrl: string;
  chiaVideoUrl: string;
  bogotaAddress: string;
  chiaAddress: string;
}

interface SedeColumnProps {
  sedeKey: "bogota" | "chia";
  sedeName: string;
  videoUrl: string;
  address: string;
  whatsappPhone: string;
  displayName?: string | null;
}

function SedeColumn({ sedeKey, sedeName, videoUrl, address, whatsappPhone, displayName }: SedeColumnProps) {
  const thumbnail = getThumbnail(videoUrl);

  return (
    <View style={{ width: CARD_W }}>
      <View style={[card.root, { height: CARD_H }]}>
        <ImageBackground
          source={SEDE_BG[sedeKey]}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          imageStyle={{ opacity: 0.28 }}
        />
        <View style={card.overlay} />

        <View style={card.goldTop} />

        <View style={card.topSection}>
          <Text style={card.kanji}>{SEDE_KANJI[sedeKey]}</Text>
          <Text style={card.sedeName}>{sedeName.toUpperCase()}</Text>
          <View style={card.goldLine} />
        </View>

        <Pressable
          style={card.videoArea}
          onPress={() => videoUrl && Linking.openURL(videoUrl)}
          disabled={!videoUrl}
        >
          {thumbnail ? (
            <>
              <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={card.playOverlay}>
                <View style={card.playBtn}>
                  <Ionicons name="play" size={16} color="#000" />
                </View>
              </View>
            </>
          ) : (
            <View style={card.noVideo}>
              <Ionicons name="videocam-outline" size={22} color="#2a2a2a" />
            </View>
          )}
        </Pressable>

        {address ? (
          <View style={card.addressRow}>
            <Ionicons name="location-sharp" size={10} color="#D4AF37" style={{ marginTop: 1 }} />
            <Text style={card.addressText} numberOfLines={3}>{address}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[card.waBtn, !whatsappPhone && { opacity: 0.3 }]}
        onPress={() => whatsappPhone && openWhatsApp(whatsappPhone, sedeName, displayName)}
        disabled={!whatsappPhone}
      >
        <MaterialCommunityIcons name="whatsapp" size={13} color="#000" />
        <Text style={card.waBtnText}>Escribir</Text>
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
      .then((s) => setSettings({
        whatsappAdminNumber: s.whatsappAdminNumber,
        bogotaVideoUrl: s.bogotaVideoUrl,
        chiaVideoUrl: s.chiaVideoUrl,
        bogotaAddress: s.bogotaAddress,
        chiaAddress: s.chiaAddress,
      }))
      .catch(() => setSettings({ whatsappAdminNumber: "", bogotaVideoUrl: "", chiaVideoUrl: "", bogotaAddress: "", chiaAddress: "" }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#D4AF37" />
        </Pressable>
        <Image source={require("@/assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>CONÓCENOS</Text>
        <Text style={styles.kanji}>道場 · Nuestras Sedes</Text>
        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator color="#D4AF37" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.row}>
            <SedeColumn
              sedeKey="bogota"
              sedeName="Bogotá"
              videoUrl={settings?.bogotaVideoUrl || ""}
              address={settings?.bogotaAddress || ""}
              whatsappPhone={settings?.whatsappAdminNumber || ""}
              displayName={user?.displayName}
            />
            <SedeColumn
              sedeKey="chia"
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
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 42,
    height: 42,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: 48,
    alignItems: "center",
  },
  title: {
    color: "#FFF",
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 20,
    letterSpacing: 5,
    marginTop: 28,
    textAlign: "center",
  },
  kanji: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 6,
    textAlign: "center",
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: "#D4AF37",
    marginTop: 16,
    marginBottom: 28,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
    alignSelf: "stretch",
  },
});

const card = StyleSheet.create({
  root: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    overflow: "hidden",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  goldTop: {
    height: 2,
    backgroundColor: "#D4AF37",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 8,
  },
  kanji: {
    color: "#D4AF37",
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 28,
    opacity: 0.9,
  },
  sedeName: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 4,
  },
  goldLine: {
    width: 24,
    height: 1,
    backgroundColor: "#D4AF37",
    marginTop: 8,
    opacity: 0.6,
  },
  videoArea: {
    marginHorizontal: 10,
    aspectRatio: 16 / 9,
    backgroundColor: "#0a0a0a",
    overflow: "hidden",
    position: "relative",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D4AF37",
    alignItems: "center",
    justifyContent: "center",
  },
  noVideo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addressRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingTop: 10,
    alignItems: "flex-start",
  },
  addressText: {
    color: "#888",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 9,
    flex: 1,
    lineHeight: 14,
  },
  waBtn: {
    backgroundColor: "#25D366",
    marginTop: 8,
    paddingVertical: 10,
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
