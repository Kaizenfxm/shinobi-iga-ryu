import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  profesor: "Profesor",
  alumno: "Alumno",
};

const ROLE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  admin: "shield-crown",
  profesor: "school",
  alumno: "account",
};

const SUB_LABELS: Record<string, string> = {
  basico: "Básico",
  medio: "Medio",
  avanzado: "Avanzado",
  personalizado: "Personalizado",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      Alert.alert("Error", "No se pudo cerrar la sesión");
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
            style={styles.profileLogo}
            resizeMode="contain"
          />
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="shield-outline" size={20} color="#555" />
            <Text style={styles.infoText}>
              Inicia sesión para ver tu perfil completo
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: (isWeb ? 67 : insets.top) + 24, paddingBottom: 100 },
        ]}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#666" />
          </View>
          <View style={styles.avatarBorder} />
        </View>

        <Text style={styles.name}>{user.displayName}</Text>
        <Text style={styles.email}>{user.email}</Text>

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.profileLogo}
          resizeMode="contain"
        />

        <View style={styles.rolesRow}>
          {user.roles.map((role) => (
            <View key={role} style={styles.rolePill}>
              <MaterialCommunityIcons
                name={ROLE_ICONS[role] || "account"}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.rolePillText}>
                {ROLE_LABELS[role] || role}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <Text style={styles.infoCardLabel}>Suscripción</Text>
            <View style={styles.subPill}>
              <Text style={styles.subPillText}>
                {SUB_LABELS[user.subscriptionLevel] || user.subscriptionLevel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoCardRow}>
            <Text style={styles.infoCardLabel}>Roles</Text>
            <Text style={styles.infoCardValue}>
              {user.roles.map((r) => ROLE_LABELS[r] || r).join(", ")}
            </Text>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
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
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#555555",
    marginTop: 4,
  },
  profileLogo: {
    width: 90,
    height: 45,
    marginTop: 8,
  },
  rolesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  rolePillText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#FFFFFF",
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
  infoCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoCardLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#888",
    letterSpacing: 1,
  },
  infoCardValue: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#FFFFFF",
  },
  subPill: {
    backgroundColor: "#1A1500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subPillText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#D4AF37",
    letterSpacing: 1,
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#0A0000",
    borderWidth: 1,
    borderColor: "#330000",
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
  },
  logoutText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#FF4444",
    letterSpacing: 1,
  },
});
