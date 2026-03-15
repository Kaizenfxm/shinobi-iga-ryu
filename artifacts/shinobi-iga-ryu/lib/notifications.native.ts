import * as Notifications from "expo-notifications";
import { type UserData } from "./api";

export async function schedulePaymentNotifications(user: UserData): Promise<void> {
  if (!user.roles.includes("alumno")) return;
  if (user.membershipStatus !== "activo") return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = newStatus;
    }
    if (finalStatus !== "granted") return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = Date.now();
    const expiryCandidate1 = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : null;
    const expiryCandidate2 = user.trialEndsAt ? new Date(user.trialEndsAt) : null;

    let expiresAt: Date | null = null;
    if (expiryCandidate1 && expiryCandidate2) {
      expiresAt = expiryCandidate1 < expiryCandidate2 ? expiryCandidate1 : expiryCandidate2;
    } else {
      expiresAt = expiryCandidate1 ?? expiryCandidate2;
    }

    if (!expiresAt) return;

    const reminders = [7, 3, 1];
    for (const days of reminders) {
      const triggerMs = expiresAt.getTime() - days * 24 * 60 * 60 * 1000;
      if (triggerMs <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "忍 Shinobi Iga Ryu",
          body:
            days === 1
              ? "Tu membresía vence mañana. Renuévala para seguir entrenando."
              : `Tu membresía vence en ${days} días. No pierdas el acceso.`,
          data: { type: "membership_reminder", daysLeft: days },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(triggerMs),
        },
      });
    }
  } catch {
  }
}

export async function cancelPaymentNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
  }
}
