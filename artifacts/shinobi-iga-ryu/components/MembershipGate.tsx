import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMembership } from "@/hooks/useMembership";
import { settingsApi } from "@/lib/api";

interface PublicSettings {
  whatsappAdminNumber: string;
  paymentLinkUrl: string;
}

export function MembershipGate({ children }: { children: React.ReactNode }) {
  const { isBlocked, status } = useMembership();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isBlocked) {
      settingsApi.getPublic().then(setSettings).catch(() => {});
    }
  }, [isBlocked]);

  if (!isBlocked) {
    return <>{children}</>;
  }

  const isPaused = status === "pausado";

  const openWhatsApp = () => {
    if (!settings?.whatsappAdminNumber) return;
    const msg = encodeURIComponent("Hola! Quiero renovar mi membresía en Shinobi Iga Ryu.");
    const url = `https://wa.me/${settings.whatsappAdminNumber}?text=${msg}`;
    Linking.openURL(url).catch(() => {});
  };

  const openPaymentLink = () => {
    if (!settings?.paymentLinkUrl) return;
    Linking.openURL(settings.paymentLinkUrl).catch(() => {});
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <MaterialCommunityIcons
            name={isPaused ? "pause-circle-outline" : "lock-outline"}
            size={48}
            color="#D4AF37"
          />
        </View>

        <Text style={styles.kanji}>忍</Text>
        <Text style={styles.title}>
          {isPaused ? "MEMBRESÍA PAUSADA" : "MEMBRESÍA INACTIVA"}
        </Text>
        <Text style={styles.subtitle}>
          {isPaused
            ? "Tu membresía está temporalmente pausada. Contacta al administrador para reactivarla."
            : "Tu período de acceso ha finalizado. Para seguir entrenando, renueva tu membresía."}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.actionsLabel}>OPCIONES DE PAGO</Text>

        {settings === null ? (
          <ActivityIndicator color="#D4AF37" style={{ marginTop: 16 }} />
        ) : (
          <>
            {settings.whatsappAdminNumber ? (
              <Pressable style={styles.whatsappBtn} onPress={openWhatsApp}>
                <MaterialCommunityIcons name="whatsapp" size={18} color="#25D366" />
                <Text style={styles.whatsappBtnText}>Enviar comprobante por WhatsApp</Text>
              </Pressable>
            ) : null}

            {settings.paymentLinkUrl ? (
              <Pressable style={styles.payBtn} onPress={openPaymentLink}>
                <MaterialCommunityIcons name="credit-card-outline" size={18} color="#000" />
                <Text style={styles.payBtnText}>Pagar en línea</Text>
              </Pressable>
            ) : null}

            {!settings.whatsappAdminNumber && !settings.paymentLinkUrl && (
              <Text style={styles.noInfoText}>
                Contacta directamente a tu academia para renovar.
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "#D4AF3730",
    backgroundColor: "#0D0B00",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  kanji: {
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 28,
    color: "#D4AF37",
    marginBottom: 8,
  },
  title: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFF",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: "#D4AF3740",
    marginVertical: 24,
  },
  actionsLabel: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 10,
    color: "#D4AF37",
    letterSpacing: 2,
    marginBottom: 16,
  },
  whatsappBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0D1F0D",
    borderWidth: 1,
    borderColor: "#25D36640",
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 10,
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
    gap: 10,
    backgroundColor: "#D4AF37",
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: 10,
  },
  payBtnText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#000",
    letterSpacing: 0.5,
  },
  noInfoText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },
});
