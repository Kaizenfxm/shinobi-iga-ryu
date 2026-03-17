import { Router } from "express";
import { db, challengesTable, pushTokensTable, trainingSystemsTable, usersTable, userRolesTable, notificationsTable } from "@workspace/db";
import { eq, and, ne, or, desc, sql, aliasedTable } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const challengerUsers = aliasedTable(usersTable, "challenger_users");
const challengedUsers = aliasedTable(usersTable, "challenged_users");

const challengesRouter = Router();

async function isAdminOrProfesor(userId: number): Promise<boolean> {
  const rows = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(and(
      eq(userRolesTable.userId, userId),
      or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
    ));
  return rows.length > 0;
}

async function sendExpoPush(token: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: "default" }),
    });
  } catch {
  }
}

async function notifyUser(targetUserId: number, title: string, body: string, data?: Record<string, unknown>) {
  const tokens = await db
    .select({ token: pushTokensTable.token })
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, targetUserId));
  await Promise.all(tokens.map((t) => sendExpoPush(t.token, title, body, data)));
}

async function createInAppNotification(targetUserId: number, title: string, body: string, createdByUserId: number) {
  await db.insert(notificationsTable).values({
    title,
    body,
    target: "personal",
    targetUserId,
    createdByUserId,
  });
}

challengesRouter.post("/push-token", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { token, platform } = req.body as { token: string; platform?: string };
    if (!token) { res.status(400).json({ error: "Token requerido" }); return; }

    const existing = await db
      .select({ id: pushTokensTable.id })
      .from(pushTokensTable)
      .where(and(eq(pushTokensTable.userId, userId), eq(pushTokensTable.token, token)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(pushTokensTable).values({ userId, token, platform: platform ?? "unknown" });
    } else {
      await db.update(pushTokensTable)
        .set({ platform: platform ?? "unknown", updatedAt: new Date() })
        .where(eq(pushTokensTable.id, existing[0].id));
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Push token error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges/users", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const users = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(and(
        eq(usersTable.membershipStatus, "activo"),
        ne(usersTable.id, userId),
      ))
      .orderBy(usersTable.displayName);
    res.json({ users });
  } catch (error) {
    console.error("Get challenge users error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges/pending-count", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(challengesTable)
      .where(and(
        eq(challengesTable.challengedId, userId),
        eq(challengesTable.status, "pending")
      ));
    res.json({ count: result[0]?.count ?? 0 });
  } catch (error) {
    console.error("Pending count error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const UNDO_WINDOW_MS = 120_000;

    const rows = await db
      .select({
        id: challengesTable.id,
        challengerId: challengesTable.challengerId,
        challengedId: challengesTable.challengedId,
        trainingSystemId: challengesTable.trainingSystemId,
        scheduledAt: challengesTable.scheduledAt,
        notes: challengesTable.notes,
        status: challengesTable.status,
        winnerId: challengesTable.winnerId,
        respondedAt: challengesTable.respondedAt,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: challengerUsers.displayName,
        challengerAvatar: challengerUsers.avatarUrl,
        challengedName: challengedUsers.displayName,
        challengedAvatar: challengedUsers.avatarUrl,
      })
      .from(challengesTable)
      .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
      .innerJoin(challengerUsers, eq(challengesTable.challengerId, challengerUsers.id))
      .innerJoin(challengedUsers, eq(challengesTable.challengedId, challengedUsers.id))
      .where(or(
        eq(challengesTable.challengerId, userId),
        eq(challengesTable.challengedId, userId)
      ))
      .orderBy(desc(challengesTable.createdAt));

    const now = Date.now();

    const pending = rows.filter((r) => {
      if (r.challengedId !== userId) return false;
      if (r.status === "pending") return true;
      if (
        (r.status === "accepted" || r.status === "declined") &&
        r.respondedAt &&
        now - new Date(r.respondedAt).getTime() < UNDO_WINDOW_MS
      ) return true;
      return false;
    });

    const active = rows.filter((r) => {
      if (r.status !== "accepted") return false;
      if (r.challengedId === userId && r.respondedAt && now - new Date(r.respondedAt).getTime() < UNDO_WINDOW_MS) return false;
      return true;
    });

    const past = rows.filter((r) => {
      if (!["completed", "declined", "cancelled"].includes(r.status)) return false;
      if (
        r.status === "declined" &&
        r.challengedId === userId &&
        r.respondedAt &&
        now - new Date(r.respondedAt).getTime() < UNDO_WINDOW_MS
      ) return false;
      return true;
    });

    res.json({ pending, active, past });
  } catch (error) {
    console.error("Get challenges error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { challengedId, trainingSystemId, scheduledAt, notes } = req.body as {
      challengedId: number;
      trainingSystemId: number;
      scheduledAt: string;
      notes?: string;
    };

    if (!challengedId || !trainingSystemId || !scheduledAt) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }
    if (challengedId === userId) {
      res.status(400).json({ error: "No puedes retarte a ti mismo" });
      return;
    }

    const [challenger] = await db
      .select({ displayName: usersTable.displayName, membershipStatus: usersTable.membershipStatus })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!challenger || challenger.membershipStatus !== "activo") {
      res.status(403).json({ error: "Solo miembros activos pueden enviar retos" });
      return;
    }

    const [challenged] = await db
      .select({ id: usersTable.id, displayName: usersTable.displayName, membershipStatus: usersTable.membershipStatus })
      .from(usersTable).where(eq(usersTable.id, challengedId)).limit(1);
    if (!challenged) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    if (challenged.membershipStatus !== "activo") {
      res.status(400).json({ error: "El usuario retado no es un miembro activo" });
      return;
    }

    const [system] = await db
      .select({ id: trainingSystemsTable.id, name: trainingSystemsTable.name })
      .from(trainingSystemsTable).where(eq(trainingSystemsTable.id, trainingSystemId)).limit(1);
    if (!system) { res.status(404).json({ error: "Sistema de entrenamiento no encontrado" }); return; }

    const [created] = await db.insert(challengesTable).values({
      challengerId: userId,
      challengedId,
      trainingSystemId,
      scheduledAt: new Date(scheduledAt),
      notes: notes?.trim() || null,
    }).returning();

    const notifTitle = "¡Te han retado!";
    const notifBody = `${challenger.displayName} te reta en ${system.name}`;

    await Promise.all([
      notifyUser(challengedId, notifTitle, notifBody, { challengeId: created.id, type: "challenge_received" }),
      createInAppNotification(challengedId, notifTitle, notifBody, userId),
    ]);

    res.status(201).json({ challenge: created });
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/respond", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));
    const { decision } = req.body as { decision: "accepted" | "declined" };

    if (!["accepted", "declined"].includes(decision)) {
      res.status(400).json({ error: "Decisión inválida" });
      return;
    }

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.challengedId !== userId) { res.status(403).json({ error: "Sin permiso" }); return; }
    if (challenge.status !== "pending") { res.status(400).json({ error: "El reto ya fue respondido" }); return; }

    const [updated] = await db.update(challengesTable)
      .set({ status: decision, respondedAt: new Date() })
      .where(eq(challengesTable.id, challengeId))
      .returning();

    const [responder] = await db
      .select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const notifTitle = "Respuesta a tu reto";
    const notifBody = decision === "accepted"
      ? `${responder?.displayName ?? "El retado"} aceptó tu reto`
      : `${responder?.displayName ?? "El retado"} declinó tu reto`;

    await Promise.all([
      notifyUser(challenge.challengerId, notifTitle, notifBody, { challengeId, type: "challenge_responded", decision }),
      createInAppNotification(challenge.challengerId, notifTitle, notifBody, userId),
    ]);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Respond challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/undo-response", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.challengedId !== userId) { res.status(403).json({ error: "Sin permiso" }); return; }
    if (!["accepted", "declined"].includes(challenge.status)) {
      res.status(400).json({ error: "No se puede deshacer este reto" });
      return;
    }
    if (!challenge.respondedAt) { res.status(400).json({ error: "Sin respuesta previa" }); return; }

    const secondsSinceResponse = (Date.now() - new Date(challenge.respondedAt).getTime()) / 1000;
    if (secondsSinceResponse > 120) {
      res.status(400).json({ error: "El tiempo para deshacer expiró (2 minutos)" });
      return;
    }

    const [updated] = await db.update(challengesTable)
      .set({ status: "pending", respondedAt: null })
      .where(eq(challengesTable.id, challengeId))
      .returning();

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Undo response error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/result", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));
    const { winnerId } = req.body as { winnerId: number };

    const canManage = await isAdminOrProfesor(userId);
    if (!canManage) { res.status(403).json({ error: "Sin permiso" }); return; }

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (!["accepted", "completed"].includes(challenge.status)) {
      res.status(400).json({ error: "El reto no está aceptado" });
      return;
    }
    if (winnerId !== challenge.challengerId && winnerId !== challenge.challengedId) {
      res.status(400).json({ error: "El ganador debe ser uno de los participantes" });
      return;
    }

    const [updated] = await db.update(challengesTable)
      .set({ status: "completed", winnerId })
      .where(eq(challengesTable.id, challengeId))
      .returning();

    const loserId = winnerId === challenge.challengerId ? challenge.challengedId : challenge.challengerId;
    const [winner] = await db
      .select({ displayName: usersTable.displayName })
      .from(usersTable).where(eq(usersTable.id, winnerId)).limit(1);

    const winnerTitle = "¡Ganaste el reto!";
    const winnerBody = "Felicidades, fuiste declarado ganador";
    const loserTitle = "Resultado del reto";
    const loserBody = `${winner?.displayName ?? "Tu rival"} fue declarado ganador`;

    await Promise.all([
      notifyUser(winnerId, winnerTitle, winnerBody, { challengeId, type: "challenge_result" }),
      createInAppNotification(winnerId, winnerTitle, winnerBody, userId),
      notifyUser(loserId, loserTitle, loserBody, { challengeId, type: "challenge_result" }),
      createInAppNotification(loserId, loserTitle, loserBody, userId),
    ]);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Result challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.delete("/challenges/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.challengerId !== userId) { res.status(403).json({ error: "Solo el retador puede cancelar" }); return; }
    if (challenge.status !== "pending") { res.status(400).json({ error: "Solo se pueden cancelar retos pendientes" }); return; }

    await db.update(challengesTable)
      .set({ status: "cancelled" })
      .where(eq(challengesTable.id, challengeId));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

export default challengesRouter;
