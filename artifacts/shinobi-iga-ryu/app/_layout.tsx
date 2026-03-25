import {
  NotoSansJP_400Regular,
  NotoSansJP_500Medium,
  NotoSansJP_700Bold,
  NotoSansJP_900Black,
  useFonts as useNotoSansFonts,
} from "@expo-google-fonts/noto-sans-jp";
import {
  NotoSerifJP_400Regular,
  NotoSerifJP_700Bold,
  NotoSerifJP_900Black,
  useFonts as useNotoSerifFonts,
} from "@expo-google-fonts/noto-serif-jp";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashAnimation from "@/components/SplashAnimation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChallengesProvider } from "@/contexts/ChallengesContext";
import NotificationBell from "@/components/NotificationBell";
import QrScannerButton from "@/components/QrScanner";
import { setupNotificationHandler } from "@/lib/notifications-setup";

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

// Suppress webfontloader's "Nms timeout exceeded" uncaught error on web.
// Our 2.5s fontsTimedOut fallback already handles the UI; this stops the
// noise from the underlying library firing at 6 s.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("error", (e) => {
    if (e.message && e.message.includes("timeout exceeded")) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (isAuthenticated && inAuthGroup) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="entrenamiento/[sistema]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="conocenos"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [notoSansLoaded, notoSansError] = useNotoSansFonts({
    NotoSansJP_400Regular,
    NotoSansJP_500Medium,
    NotoSansJP_700Bold,
    NotoSansJP_900Black,
  });

  const [notoSerifLoaded, notoSerifError] = useNotoSerifFonts({
    NotoSerifJP_400Regular,
    NotoSerifJP_700Bold,
    NotoSerifJP_900Black,
  });

  // Force-proceed after 2.5s so a slow/unavailable Google Fonts CDN
  // never blocks the app (the webfontloader default timeout is 6000ms).
  const [fontsTimedOut, setFontsTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setFontsTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  const fontsLoaded =
    (interLoaded && notoSansLoaded && notoSerifLoaded) || fontsTimedOut;
  const fontError = interError || notoSansError || notoSerifError;

  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (!splashDone) {
    return (
      <>
        <StatusBar style="light" />
        <SplashAnimation onFinish={() => setSplashDone(true)} />
      </>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <NotificationProvider>
                  <ChallengesProvider>
                    <StatusBar style="light" />
                    <View style={{ flex: 1 }}>
                      <RootLayoutNav />
                      <NotificationBell />
                    </View>
                  </ChallengesProvider>
                </NotificationProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
