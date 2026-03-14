import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationData } from "@/lib/api";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days}d`;
}

function NotifItem({ item }: { item: NotificationData }) {
  const isRead = !!item.readAt;
  return (
    <View style={[styles.notifItem, !isRead && styles.notifItemUnread]}>
      {!isRead && <View style={styles.unreadDot} />}
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifBody}>{item.body}</Text>
        <Text style={styles.notifMeta}>{timeAgo(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function NotificationBell() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, loading, markAllRead, refresh } = useNotifications();
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    setMarking(true);
    try {
      await refresh();
      await markAllRead();
    } finally {
      setMarking(false);
    }
  }, [refresh, markAllRead]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  if (!isAuthenticated) return null;

  const topOffset = (isWeb ? 67 : insets.top) + 8;

  return (
    <>
      <Pressable
        style={[styles.bellBtn, { top: topOffset }]}
        onPress={handleOpen}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Pressable
            style={[styles.panel, { marginTop: topOffset + 36 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.panelHeader}>
              <View style={styles.panelTitleRow}>
                <Text style={styles.panelTitle}>通知 NOTIFICACIONES</Text>
                {marking && <ActivityIndicator size="small" color="#D4AF37" />}
              </View>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Ionicons name="close" size={20} color="#666" />
              </Pressable>
            </View>

            <View style={styles.panelDivider} />

            {loading && notifications.length === 0 ? (
              <View style={styles.emptyView}>
                <ActivityIndicator color="#D4AF37" />
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyView}>
                <Ionicons name="notifications-off-outline" size={36} color="#333" />
                <Text style={styles.emptyText}>Sin notificaciones</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {notifications.map((n) => (
                  <NotifItem key={n.id} item={n} />
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    position: "absolute",
    right: 16,
    zIndex: 200,
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#FFF",
    lineHeight: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  panel: {
    marginHorizontal: 12,
    backgroundColor: "#0D0D0D",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    maxHeight: 480,
    overflow: "hidden",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  panelTitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 11,
    color: "#D4AF37",
    letterSpacing: 3,
  },
  panelDivider: {
    height: 1,
    backgroundColor: "#1A1A1A",
  },
  emptyView: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#444",
    letterSpacing: 1,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingBottom: 8,
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    gap: 10,
  },
  notifItemUnread: {
    backgroundColor: "#0A0800",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
    marginTop: 5,
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  notifBody: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#888",
    lineHeight: 18,
  },
  notifMeta: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
});
