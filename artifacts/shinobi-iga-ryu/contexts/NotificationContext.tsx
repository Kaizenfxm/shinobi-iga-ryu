import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { notificationsApi, type NotificationData } from "@/lib/api";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markAllRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail — network/auth errors are expected
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    refresh().finally(() => setLoading(false));

    intervalRef.current = setInterval(() => {
      refresh();
    }, 30_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, refresh]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
