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
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import SplashAnimation from "@/components/SplashAnimation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/auth");
    } else if (isAuthenticated && inAuthGroup) {
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

  const fontsLoaded = interLoaded && notoSansLoaded && notoSerifLoaded;
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
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
