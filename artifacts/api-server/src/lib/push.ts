import { db, pushTokensTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

export async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: "default" }),
    });
    const result = await response.json() as {
      data?: { status: string; message?: string; details?: { error?: string } };
    };
    if (result.data?.status === "error") {
      const errCode = result.data.details?.error;
      console.error(`[Push] Delivery error for token ${token.slice(0, 30)}...: ${result.data.message} (${errCode})`);
      if (errCode === "DeviceNotRegistered") {
        await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
        console.log(`[Push] Removed stale token: ${token.slice(0, 30)}...`);
      } else if (errCode === "InvalidCredentials") {
        console.error(`[Push] InvalidCredentials — check APNs/FCM config, token NOT removed.`);
      }
    }
  } catch (e) {
    console.error(`[Push] Network error sending to ${token.slice(0, 30)}...:`, e);
  }
}

export async function notifyUser(
  targetUserId: number,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const tokens = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(eq(pushTokensTable.userId, targetUserId));
    await Promise.all(tokens.map((t) => sendExpoPush(t.token, title, body, data)));
  } catch {}
}

export async function notifyUsers(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (userIds.length === 0) return;
  try {
    const tokens = await db
      .select({ token: pushTokensTable.token })
      .from(pushTokensTable)
      .where(inArray(pushTokensTable.userId, userIds));
    await Promise.all(tokens.map((t) => sendExpoPush(t.token, title, body, data)));
  } catch {}
}

export async function notifyTarget(
  targets: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const allUserIds = new Set<number>();

    for (const target of targets) {
      if (target === "todas") {
        const rows = await db
          .select({ id: pushTokensTable.userId })
          .from(pushTokensTable);
        rows.forEach((r) => allUserIds.add(r.id));
      } else if (target === "bogota") {
        const rows = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(sql`${usersTable.sedes} @> ARRAY['bogota']::text[]`);
        rows.forEach((r) => allUserIds.add(r.id));
      } else if (target === "chia") {
        const rows = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(sql`${usersTable.sedes} @> ARRAY['chia']::text[]`);
        rows.forEach((r) => allUserIds.add(r.id));
      } else if (target === "luchadores") {
        const rows = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.isFighter, true));
        rows.forEach((r) => allUserIds.add(r.id));
      } else if (target === "admins") {
        const rows = await db
          .select({ userId: userRolesTable.userId })
          .from(userRolesTable)
          .where(eq(userRolesTable.role, "admin"));
        rows.forEach((r) => allUserIds.add(r.userId));
      } else if (target === "profesores") {
        const rows = await db
          .select({ userId: userRolesTable.userId })
          .from(userRolesTable)
          .where(eq(userRolesTable.role, "profesor"));
        rows.forEach((r) => allUserIds.add(r.userId));
      }
    }

    await notifyUsers([...allUserIds], title, body, data);
  } catch {}
}

export async function notifyAllAdmins(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    const rows = await db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .where(eq(userRolesTable.role, "admin"));
    const adminIds = rows.map((r) => r.userId);
    await notifyUsers(adminIds, title, body, data);
  } catch {}
}
