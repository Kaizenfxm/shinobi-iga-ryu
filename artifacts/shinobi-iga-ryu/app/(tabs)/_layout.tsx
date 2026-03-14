import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const { hasRole, isAuthenticated } = useAuth();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  const showAdmin = isAuthenticated && hasRole("admin");
  const showAlumnos = isAuthenticated && hasRole("profesor");

  return (
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
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
