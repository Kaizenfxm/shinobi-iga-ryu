import { db, pushTokensTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

export async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: "default" }),
    });
  } catch {}
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
  target: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    let userIds: number[] = [];

    if (target === "todas") {
      const rows = await db
        .select({ id: pushTokensTable.userId })
        .from(pushTokensTable);
      userIds = [...new Set(rows.map((r) => r.id))];
    } else if (target === "bogota") {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(sql`${usersTable.sedes} @> ARRAY['bogota']::text[]`);
      userIds = rows.map((r) => r.id);
    } else if (target === "chia") {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(sql`${usersTable.sedes} @> ARRAY['chia']::text[]`);
      userIds = rows.map((r) => r.id);
    } else if (target === "luchadores") {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.isFighter, true));
      userIds = rows.map((r) => r.id);
    }

    await notifyUsers(userIds, title, body, data);
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
