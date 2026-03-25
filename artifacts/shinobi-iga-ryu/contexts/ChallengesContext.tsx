import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { challengesApi } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface ChallengesContextType {
  pendingCount: number;
  refresh: () => Promise<void>;
}

const ChallengesContext = createContext<ChallengesContextType>({
  pendingCount: 0,
  refresh: async () => {},
});

export function ChallengesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushRegisteredRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await challengesApi.getPendingCount();
      setPendingCount(data.count);
    } catch {
    }
  }, [isAuthenticated]);

  const registerPushToken = useCallback(async () => {
    if (pushRegisteredRef.current) return;
    if (Platform.OS === "web") return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: "03536a1a-7682-4c56-9f66-41a09696cb4e",
      });
      if (tokenData.data) {
        await challengesApi.registerPushToken(tokenData.data, Platform.OS);
        pushRegisteredRef.current = true;
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPendingCount(0);
      pushRegisteredRef.current = false;
      return;
    }

    refresh();
    registerPushToken();

    intervalRef.current = setInterval(() => {
      refresh();
    }, 20_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, refresh, registerPushToken]);

  return (
    <ChallengesContext.Provider value={{ pendingCount, refresh }}>
      {children}
    </ChallengesContext.Provider>
  );
}

export function useChallenges() {
  return useContext(ChallengesContext);
}
