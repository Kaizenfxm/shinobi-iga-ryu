import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import { Platform, StyleSheet, View, Text, Pressable } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { MembershipGate } from "@/components/MembershipGate";
import { useMembership } from "@/hooks/useMembership";
import { useChallenges } from "@/contexts/ChallengesContext";
import QrScannerButton from "@/components/QrScanner";
import { suggestionsApi } from "@/lib/api";

function CountdownBadge() {
  const { showCountdown, daysRemaining } = useMembership();
  const router = useRouter();

  if (!showCountdown || daysRemaining === null) return null;

  return (
    <Pressable
      style={countdownStyles.badge}
      onPress={() => router.push("/(tabs)/profile")}
    >
      <MaterialCommunityIcons name="clock-alert-outline" size={13} color="#000" />
      <Text style={countdownStyles.text}>{daysRemaining}d</Text>
    </Pressable>
  );
}

const countdownStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 8,
    right: 16,
    zIndex: 100,
  },
  text: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 11,
    color: "#000",
    letterSpacing: 0.5,
  },
});

export default function TabLayout() {
  const { hasRole, isAuthenticated, user } = useAuth();
  const { pendingCount } = useChallenges();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const requireAuth = (e: { preventDefault: () => void }) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push("/auth");
    }
  };

  const showAdmin = isAuthenticated && hasRole("admin");
  const showAlumnos = isAuthenticated && hasRole("profesor");

  const [adminSuggestionCount, setAdminSuggestionCount] = useState(0);

  const fetchAdminSuggestionCount = useCallback(async () => {
    if (!showAdmin) return;
    try {
      const { count } = await suggestionsApi.adminUnreviewedCount();
      setAdminSuggestionCount(count);
    } catch {}
  }, [showAdmin]);

  useEffect(() => {
    fetchAdminSuggestionCount();
    const interval = setInterval(fetchAdminSuggestionCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchAdminSuggestionCount]);

  return (
    <MembershipGate>
      <View style={{ flex: 1 }}>
        <CountdownBadge />
        <QrScannerButton />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: "#FFFFFF",
            tabBarInactiveTintColor: "#555555",
            tabBarStyle: {
              position: "absolute",
              backgroundColor: isIOS ? "transparent" : "#000000",
              borderTopWidth: 1,
              borderTopColor: "#1A1A1A",
              elevation: 0,
              ...(isWeb ? { height: 84 } : {}),
            },
            tabBarBackground: () =>
              isIOS ? (
                <BlurView
                  intensity={100}
                  tint="dark"
                  style={StyleSheet.absoluteFill}
                />
              ) : isWeb ? (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: "#000000" }]}
                />
              ) : null,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Artes",
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="karate" size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="admin"
            options={{
              title: "Admin",
              href: showAdmin ? undefined : null,
              tabBarBadge: showAdmin && adminSuggestionCount > 0 ? adminSuggestionCount : undefined,
              tabBarBadgeStyle: { backgroundColor: "#FF3B30", color: "#fff", fontSize: 10, fontFamily: "NotoSansJP_700Bold" },
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="shield-crown" size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="alumnos"
            options={{
              title: "Alumnos",
              href: showAlumnos ? undefined : null,
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="school" size={22} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="carrera"
            options={{
              title: "Carrera",
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="medal" size={22} color={color} />
              ),
            }}
            listeners={{ tabPress: requireAuth }}
          />
          <Tabs.Screen
            name="belts"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="fights"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="comunidad"
            options={{
              title: "Comunidad",
              tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
              tabBarBadgeStyle: { backgroundColor: "#D4AF37", color: "#000", fontSize: 10, fontFamily: "NotoSansJP_700Bold" },
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons name="account-group-outline" size={22} color={color} />
              ),
            }}
            listeners={{ tabPress: requireAuth }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Perfil",
              tabBarIcon: ({ color }) => (
                <Ionicons name="person-outline" size={22} color={color} />
              ),
            }}
            listeners={{ tabPress: requireAuth }}
          />
        </Tabs>
      </View>
    </MembershipGate>
  );
}
