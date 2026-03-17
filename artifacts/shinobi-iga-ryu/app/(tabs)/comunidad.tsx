import React, { useState } from "react";
import { View, Text, StyleSheet, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "react-native";

type ComunidadTab = "eventos" | "retos" | "ranking" | "clases";

const TABS: { key: ComunidadTab; label: string }[] = [
  { key: "eventos", label: "EVENTOS" },
  { key: "retos", label: "RETOS" },
  { key: "ranking", label: "RANKING" },
  { key: "clases", label: "CLASES" },
];

export default function ComunidadScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const [activeTab, setActiveTab] = useState<ComunidadTab>("eventos");

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: isWeb ? 16 : insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.subTabBar}>
          {TABS.map((tab, i) => (
            <React.Fragment key={tab.key}>
              {i > 0 && <View style={styles.subTabSep} />}
              <Pressable
                style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.subTabText, activeTab === tab.key && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.comingSoon}>Próximamente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  headerContainer: {
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 0,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  logoImage: {
    width: 34,
    height: 34,
  },
  subTabBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabActive: {
    borderBottomColor: "#D4AF37",
  },
  subTabSep: {
    width: 1,
    height: 14,
    backgroundColor: "#1a1a1a",
  },
  subTabText: {
    color: "#555",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    letterSpacing: 1,
  },
  subTabTextActive: {
    color: "#D4AF37",
    fontFamily: "NotoSansJP_700Bold",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  comingSoon: {
    color: "#333",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    letterSpacing: 2,
  },
});
