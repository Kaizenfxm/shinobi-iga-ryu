import { Router } from "express";
import { db, notificationsTable, notificationReadsTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, desc, and, or, gte, isNull, inArray, sql } from "drizzle-orm";
import { requireAuth, requireProfesorOrAdmin } from "../middlewares/auth";
import { notifyTarget } from "../lib/push";

const notificationsRouter = Router();

const VALID_TARGETS = ["todas", "bogota", "chia", "luchadores", "admins", "profesores"] as const;

async function getUserTargetInfo(userId: number) {
  const [user] = await db
    .select({ isFighter: usersTable.isFighter, sedes: usersTable.sedes, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(eq(userRolesTable.userId, userId));

  const roleSet = new Set(roles.map((r) => r.role));

  return {
    ...(user ?? { isFighter: false, sedes: [] as string[], createdAt: new Date(0) }),
    isAdmin: roleSet.has("admin"),
    isProfesor: roleSet.has("profesor"),
  };
}

function buildTargetCondition(
  isFighter: boolean,
  sedes: string[],
  isAdmin: boolean,
  isProfesor: boolean,
  userId: number
) {
  const allowedTargets = ["todas"];
  if (isFighter) allowedTargets.push("luchadores");
  if (sedes.includes("bogota")) allowedTargets.push("bogota");
  if (sedes.includes("chia")) allowedTargets.push("chia");
  if (isAdmin) allowedTargets.push("admins");
  if (isProfesor) allowedTargets.push("profesores");

  const targetsLiteral = allowedTargets.map((t) => `'${t}'`).join(",");

  return or(
    and(
      sql`EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(
          CASE WHEN ${notificationsTable.target} LIKE '[%'
            THEN ${notificationsTable.target}::jsonb
            ELSE jsonb_build_array(${notificationsTable.target})
          END
        ) AS t(v)
        WHERE t.v = ANY(ARRAY[${sql.raw(targetsLiteral)}]::text[])
      )`,
      isNull(notificationsTable.targetUserId)
    ),
    eq(notificationsTable.targetUserId, userId)
  );
}

function parseTargets(raw: string): string[] {
  if (!raw) return ["todas"];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // legacy bare-string fallback (should not occur after migration)
    return [raw];
  }
  return ["todas"];
}

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { isFighter, sedes, createdAt: userCreatedAt, isAdmin, isProfesor } = await getUserTargetInfo(userId);
    const targetCond = buildTargetCondition(isFighter, sedes as string[], isAdmin, isProfesor, userId);

    const rows = await db
      .select({
        id: notificationsTable.id,
        title: notificationsTable.title,
        body: notificationsTable.body,
        target: notificationsTable.target,
        createdAt: notificationsTable.createdAt,
        createdByName: usersTable.displayName,
        readAt: notificationReadsTable.readAt,
      })
      .from(notificationsTable)
      .leftJoin(usersTable, eq(notificationsTable.createdByUserId, usersTable.id))
      .leftJoin(
        notificationReadsTable,
        and(
          eq(notificationReadsTable.notificationId, notificationsTable.id),
          eq(notificationReadsTable.userId, userId)
        )
      )
      .where(and(targetCond!, gte(notificationsTable.createdAt, userCreatedAt)))
      .orderBy(desc(notificationsTable.createdAt));

    const notifications = rows.map((n) => ({
      ...n,
      target: parseTargets(n.target),
    }));

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

notificationsRouter.post("/notifications", requireProfesorOrAdmin, async (req, res) => {
  try {
    const adminId = req.session.userId!;
    const { title, body, targets } = req.body as {
      title?: string;
      body?: string;
      targets?: string[];
    };

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "Título y mensaje son requeridos" });
      return;
    }

    const resolvedTargets = Array.isArray(targets)
      ? [...new Set(targets.filter((t) => VALID_TARGETS.includes(t as typeof VALID_TARGETS[number])))]
      : [];
    if (resolvedTargets.length === 0) resolvedTargets.push("todas");

    const targetStr = JSON.stringify(resolvedTargets);

    const [notification] = await db
      .insert(notificationsTable)
      .values({
        title: title.trim(),
        body: body.trim(),
        target: targetStr,
        createdByUserId: adminId,
      })
      .returning();

    void notifyTarget(resolvedTargets, title.trim(), body.trim());

    res.json({
      notification: {
        ...notification,
        target: parseTargets(notification.target),
      },
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

notificationsRouter.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { isFighter, sedes, createdAt: userCreatedAt, isAdmin, isProfesor } = await getUserTargetInfo(userId);
    const targetCond = buildTargetCondition(isFighter, sedes as string[], isAdmin, isProfesor, userId);

    const relevantNotifs = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(and(targetCond!, gte(notificationsTable.createdAt, userCreatedAt)));

    if (relevantNotifs.length === 0) {
      res.json({ ok: true });
      return;
    }

    const notifIds = relevantNotifs.map((n) => n.id);

    const alreadyRead = await db
      .select({ notificationId: notificationReadsTable.notificationId })
      .from(notificationReadsTable)
      .where(
        and(
          eq(notificationReadsTable.userId, userId),
          inArray(notificationReadsTable.notificationId, notifIds)
        )
      );

    const alreadyReadIds = new Set(alreadyRead.map((r) => r.notificationId));
    const toInsert = notifIds
      .filter((id) => !alreadyReadIds.has(id))
      .map((notificationId) => ({ notificationId, userId }));

    if (toInsert.length > 0) {
      await db.insert(notificationReadsTable).values(toInsert);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Read all notifications error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

notificationsRouter.post("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const notifId = Number(String(req.params["id"]));

    if (isNaN(notifId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db
      .insert(notificationReadsTable)
      .values({ notificationId: notifId, userId })
      .onConflictDoNothing();

    res.json({ ok: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default notificationsRouter;
