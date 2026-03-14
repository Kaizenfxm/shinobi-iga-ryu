import { Router } from "express";
import { db, notificationsTable, notificationReadsTable, usersTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const notificationsRouter = Router();

async function getUserTargetInfo(userId: number) {
  const [user] = await db
    .select({ isFighter: usersTable.isFighter, sedes: usersTable.sedes })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  return user ?? { isFighter: false, sedes: [] as string[] };
}

function buildTargetCondition(isFighter: boolean, sedes: string[]) {
  const allowedTargets = ["todas"];
  if (isFighter) allowedTargets.push("peleadores");
  if (sedes.includes("bogota")) allowedTargets.push("bogota");
  if (sedes.includes("chia")) allowedTargets.push("chia");
  return inArray(notificationsTable.target, allowedTargets);
}

notificationsRouter.get("/notifications", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { isFighter, sedes } = await getUserTargetInfo(userId);
    const targetCond = buildTargetCondition(isFighter, sedes as string[]);

    const notifications = await db
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
      .where(targetCond)
      .orderBy(desc(notificationsTable.createdAt));

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

notificationsRouter.post("/notifications", requireAdmin, async (req, res) => {
  try {
    const adminId = req.session.userId!;
    const { title, body, target } = req.body as { title?: string; body?: string; target?: string };

    if (!title?.trim() || !body?.trim()) {
      res.status(400).json({ error: "Título y mensaje son requeridos" });
      return;
    }

    const validTargets = ["todas", "bogota", "chia", "peleadores"];
    const resolvedTarget = validTargets.includes(target ?? "") ? target! : "todas";

    const [notification] = await db
      .insert(notificationsTable)
      .values({
        title: title.trim(),
        body: body.trim(),
        target: resolvedTarget,
        createdByUserId: adminId,
      })
      .returning();

    res.json({ notification });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

notificationsRouter.post("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { isFighter, sedes } = await getUserTargetInfo(userId);
    const targetCond = buildTargetCondition(isFighter, sedes as string[]);

    const relevantNotifs = await db
      .select({ id: notificationsTable.id })
      .from(notificationsTable)
      .where(targetCond);

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
