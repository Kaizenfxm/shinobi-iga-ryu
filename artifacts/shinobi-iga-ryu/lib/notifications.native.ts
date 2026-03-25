import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type UserData, type WeightData } from "./api";

const TITLE = "忍 Shinobi Iga Ryu";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function scheduleIf(triggerMs: number, body: string, dataType: string): Promise<void> {
  if (triggerMs <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: TITLE,
      body,
      data: { type: dataType },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerMs),
    },
  });
}

export async function schedulePaymentNotifications(user: UserData): Promise<void> {
  if (!user.roles.includes("alumno")) return;
  if (user.roles.includes("admin") || user.roles.includes("profesor")) return;
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

    const isNewUser = user.lastPaymentAt === null;

    if (isNewUser) {
      if (!user.trialEndsAt) return;

      const registrationTime = new Date(user.trialEndsAt).getTime() - 72 * HOUR_MS;

      const registrationDate = new Date(registrationTime);
      const tonightAt8pm = new Date(registrationDate);
      tonightAt8pm.setHours(20, 0, 0, 0);

      await scheduleIf(
        tonightAt8pm.getTime(),
        "Tienes acceso preferencial por 72h. Estás a un paso de tus objetivos — actívalo hoy.",
        "trial_reminder"
      );

      await scheduleIf(
        registrationTime + 24 * HOUR_MS,
        "Quedan 48 horas para tu precio especial. El que tarda, pierde el filo. Ve a tu perfil o escríbenos por WhatsApp.",
        "trial_reminder"
      );

      await scheduleIf(
        registrationTime + 48 * HOUR_MS,
        "Quedan 24 horas. Lo que se aplaza se retrasa. El maestro llega cuando el alumno está listo — ¿lo estás?",
        "trial_reminder"
      );

      await scheduleIf(
        registrationTime + 68 * HOUR_MS,
        "Faltan 4 horas para que expire tu descuento. El primer paso es el más difícil — da el tuyo ahora.",
        "trial_reminder"
      );
    } else {
      const expiresAt = user.membershipExpiresAt
        ? new Date(user.membershipExpiresAt).getTime()
        : user.trialEndsAt
          ? new Date(user.trialEndsAt).getTime()
          : null;

      if (!expiresAt) return;

      await scheduleIf(
        expiresAt - 7 * DAY_MS,
        "Tu membresía vence en 7 días. El guerrero que se prepara no improvisa. Renueva y sigue el camino.",
        "membership_reminder"
      );

      await scheduleIf(
        expiresAt - 4 * DAY_MS,
        "Faltan 4 días. La disciplina no descansa — tampoco tu entrenamiento. Renueva tu acceso.",
        "membership_reminder"
      );

      await scheduleIf(
        expiresAt - 3 * DAY_MS,
        "3 días para que venza tu membresía. Quien persevera, avanza. No dejes que el tiempo te detenga.",
        "membership_reminder"
      );

      await scheduleIf(
        expiresAt - DAY_MS,
        "Tu membresía vence mañana. El que se compromete con el camino no se detiene. Renuévala ahora.",
        "membership_reminder"
      );
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

const WEIGHT_REMINDER_KEY = "weight_reminder_scheduled_at";
const THIRTY_DAYS_MS = 30 * DAY_MS;

export async function scheduleWeightReminder(userId: number, weightData: WeightData): Promise<void> {
  if (weightData.initialWeight == null) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      finalStatus = newStatus;
    }
    if (finalStatus !== "granted") return;

    const storageKey = `${WEIGHT_REMINDER_KEY}_${userId}`;
    const lastScheduled = await AsyncStorage.getItem(storageKey);
    const now = Date.now();

    if (lastScheduled) {
      const lastMs = parseInt(lastScheduled, 10);
      if (now - lastMs < THIRTY_DAYS_MS) return;
    }

    const triggerDate = new Date(now + THIRTY_DAYS_MS);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: TITLE,
        body: "Es momento de registrar tu peso actual. Mantén tu seguimiento al día.",
        data: { type: "weight_reminder", userId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    await AsyncStorage.setItem(storageKey, String(now));
  } catch {
  }
}
