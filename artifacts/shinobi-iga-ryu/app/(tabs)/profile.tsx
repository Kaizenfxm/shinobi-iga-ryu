import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          { paddingTop: (isWeb ? 67 : insets.top) + 24 },
        ]}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#444" />
          </View>
          <View style={styles.avatarBorder} />
        </View>

        <Text style={styles.name}>Ninja</Text>
        <Text style={styles.subtitle}>Alumno · Shinobi Iga Ryu</Text>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="shield-outline" size={20} color="#555" />
          <Text style={styles.infoText}>
            Inicia sesión para ver tu perfil completo
          </Text>
        </View>

        <View style={styles.comingSoon}>
          <MaterialCommunityIcons name="lock-outline" size={32} color="#333" />
          <Text style={styles.comingSoonText}>Próximamente</Text>
          <Text style={styles.comingSoonSubtext}>
            Login, cinturones, y más
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#111111",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarBorder: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "#333333",
  },
  name: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  subtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#555555",
    letterSpacing: 2,
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "#222222",
    marginVertical: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#0A0A0A",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    width: "100%",
  },
  infoText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666666",
    flex: 1,
  },
  comingSoon: {
    marginTop: 60,
    alignItems: "center",
    gap: 8,
  },
  comingSoonText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#333333",
    letterSpacing: 4,
  },
  comingSoonSubtext: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#222222",
  },
});
