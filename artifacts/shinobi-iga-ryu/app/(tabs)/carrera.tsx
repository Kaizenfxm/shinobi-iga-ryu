import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import BeltsScreen from "./belts";
import FightsScreen from "./fights";

type SubTab = "cinturones" | "peleas";

export default function CarreraScreen() {
  const [activeTab, setActiveTab] = useState<SubTab>("cinturones");
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <View style={styles.root}>
      <View style={[styles.subTabContainer, { paddingTop: isWeb ? 67 : insets.top }]}>
        <View style={styles.subTabBar}>
          <Pressable
            style={[styles.subTab, activeTab === "cinturones" && styles.subTabActive]}
            onPress={() => setActiveTab("cinturones")}
          >
            <MaterialCommunityIcons
              name="medal"
              size={15}
              color={activeTab === "cinturones" ? "#D4AF37" : "#555"}
            />
            <Text style={[styles.subTabText, activeTab === "cinturones" && styles.subTabTextActive]}>
              CINTURONES
            </Text>
          </Pressable>

          <View style={styles.subTabSep} />

          <Pressable
            style={[styles.subTab, activeTab === "peleas" && styles.subTabActive]}
            onPress={() => setActiveTab("peleas")}
          >
            <MaterialCommunityIcons
              name="sword-cross"
              size={15}
              color={activeTab === "peleas" ? "#D4AF37" : "#555"}
            />
            <Text style={[styles.subTabText, activeTab === "peleas" && styles.subTabTextActive]}>
              PELEAS
            </Text>
          </Pressable>
        </View>

        <View style={styles.subTabUnderline} />
      </View>

      <View style={styles.content}>
        {activeTab === "cinturones" ? (
          <BeltsScreen skipSafeArea />
        ) : (
          <FightsScreen skipSafeArea />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  subTabContainer: {
    backgroundColor: "#000000",
  },
  subTabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 32,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
  },
  subTabActive: {},
  subTabSep: {
    width: 1,
    height: 18,
    backgroundColor: "#1A1A1A",
  },
  subTabText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    color: "#555",
    letterSpacing: 2,
  },
  subTabTextActive: {
    color: "#D4AF37",
  },
  subTabUnderline: {
    height: 1,
    backgroundColor: "#1A1A1A",
  },
  content: {
    flex: 1,
  },
});
