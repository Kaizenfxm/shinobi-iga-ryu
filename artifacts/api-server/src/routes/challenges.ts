import { Router } from "express";
import { db, challengesTable, pushTokensTable, trainingSystemsTable, usersTable, userRolesTable, notificationsTable } from "@workspace/db";
import { eq, and, ne, or, desc, sql, aliasedTable } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { notifyUser, notifyTarget } from "../lib/push";

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

async function createInAppNotification(targetUserId: number, title: string, body: string, createdByUserId: number) {
  await db.insert(notificationsTable).values({
    title,
    body,
    target: "personal",
    targetUserId,
    createdByUserId,
  });
  void notifyUser(targetUserId, title, body);
}

challengesRouter.post("/push-token", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { token, platform } = req.body as { token: string; platform?: string };
    if (!token) { res.status(400).json({ error: "Token requerido" }); return; }

    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.token, token), ne(pushTokensTable.userId, userId)));

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
        displayName: sql<string>`COALESCE(${usersTable.nickname}, ${usersTable.displayName})`.as("display_name"),
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(and(
        eq(usersTable.membershipStatus, "activo"),
        eq(usersTable.hiddenFromCommunity, false),
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
        videoUrl: challengesTable.videoUrl,
        cancelRequestedBy: challengesTable.cancelRequestedBy,
        respondedAt: challengesTable.respondedAt,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: sql<string>`COALESCE(${challengerUsers.nickname}, ${challengerUsers.displayName})`.as("challenger_name"),
        challengerAvatar: challengerUsers.avatarUrl,
        challengedName: sql<string>`COALESCE(${challengedUsers.nickname}, ${challengedUsers.displayName})`.as("challenged_name"),
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

    const sent = rows.filter((r) =>
      r.challengerId === userId && r.status === "pending"
    );

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

    res.json({ pending, sent, active, past });
  } catch (error) {
    console.error("Get challenges error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges/community-pending", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select({
        id: challengesTable.id,
        challengerId: challengesTable.challengerId,
        challengedId: challengesTable.challengedId,
        trainingSystemId: challengesTable.trainingSystemId,
        scheduledAt: challengesTable.scheduledAt,
        notes: challengesTable.notes,
        status: challengesTable.status,
        videoUrl: challengesTable.videoUrl,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: sql<string>`COALESCE(${challengerUsers.nickname}, ${challengerUsers.displayName})`.as("challenger_name"),
        challengerAvatar: challengerUsers.avatarUrl,
        challengedName: sql<string>`COALESCE(${challengedUsers.nickname}, ${challengedUsers.displayName})`.as("challenged_name"),
        challengedAvatar: challengedUsers.avatarUrl,
      })
      .from(challengesTable)
      .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
      .innerJoin(challengerUsers, eq(challengesTable.challengerId, challengerUsers.id))
      .innerJoin(challengedUsers, eq(challengesTable.challengedId, challengedUsers.id))
      .where(eq(challengesTable.status, "pending"))
      .orderBy(desc(challengesTable.createdAt))
      .limit(30);
    res.json({ challenges: rows });
  } catch (error) {
    console.error("Community pending error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges/community-active", requireAuth, async (req, res) => {
  try {
    const UNDO_WINDOW_MS = 120_000;
    const now = new Date();
    const undoCutoff = new Date(now.getTime() - UNDO_WINDOW_MS);

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
        videoUrl: challengesTable.videoUrl,
        cancelRequestedBy: challengesTable.cancelRequestedBy,
        respondedAt: challengesTable.respondedAt,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: sql<string>`COALESCE(${challengerUsers.nickname}, ${challengerUsers.displayName})`.as("challenger_name"),
        challengerAvatar: challengerUsers.avatarUrl,
        challengedName: sql<string>`COALESCE(${challengedUsers.nickname}, ${challengedUsers.displayName})`.as("challenged_name"),
        challengedAvatar: challengedUsers.avatarUrl,
      })
      .from(challengesTable)
      .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
      .innerJoin(challengerUsers, eq(challengesTable.challengerId, challengerUsers.id))
      .innerJoin(challengedUsers, eq(challengesTable.challengedId, challengedUsers.id))
      .where(
        and(
          eq(challengesTable.status, "accepted"),
          or(
            sql`${challengesTable.respondedAt} IS NULL`,
            sql`${challengesTable.respondedAt} <= ${undoCutoff.toISOString()}`
          )
        )
      )
      .orderBy(desc(challengesTable.scheduledAt));

    res.json({ challenges: rows });
  } catch (error) {
    console.error("Community active error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/challenges/community-past", requireAuth, async (req, res) => {
  try {
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
        videoUrl: challengesTable.videoUrl,
        cancelRequestedBy: challengesTable.cancelRequestedBy,
        respondedAt: challengesTable.respondedAt,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: sql<string>`COALESCE(${challengerUsers.nickname}, ${challengerUsers.displayName})`.as("challenger_name"),
        challengerAvatar: challengerUsers.avatarUrl,
        challengedName: sql<string>`COALESCE(${challengedUsers.nickname}, ${challengedUsers.displayName})`.as("challenged_name"),
        challengedAvatar: challengedUsers.avatarUrl,
      })
      .from(challengesTable)
      .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
      .innerJoin(challengerUsers, eq(challengesTable.challengerId, challengerUsers.id))
      .innerJoin(challengedUsers, eq(challengesTable.challengedId, challengedUsers.id))
      .where(or(
        eq(challengesTable.status, "completed"),
        eq(challengesTable.status, "declined"),
        eq(challengesTable.status, "cancelled"),
      ))
      .orderBy(desc(challengesTable.createdAt))
      .limit(100);
    res.json({ challenges: rows });
  } catch (error) {
    console.error("Community past error:", error);
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
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname, membershipStatus: usersTable.membershipStatus })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!challenger || challenger.membershipStatus !== "activo") {
      res.status(403).json({ error: "Solo miembros activos pueden enviar retos" });
      return;
    }

    const [challenged] = await db
      .select({ id: usersTable.id, displayName: usersTable.displayName, nickname: usersTable.nickname, membershipStatus: usersTable.membershipStatus })
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

    const challengerLabel = challenger.nickname ?? challenger.displayName;
    const challengedLabel = challenged.nickname ?? challenged.displayName;

    const notifTitle = "¡Te han retado!";
    const notifBody = `${challengerLabel} te reta en ${system.name}`;

    void createInAppNotification(challengedId, notifTitle, notifBody, userId);

    // Notify entire community about the new challenge
    const dateStr = new Date(scheduledAt).toLocaleDateString("es-CO", {
      day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const communityTitle = "⚔️ ¡Nuevo reto en la comunidad!";
    const communityBody = `${challengerLabel} retó a ${challengedLabel} en ${system.name} el ${dateStr}. ¿Aceptará?`;
    void notifyTarget(["todas"], communityTitle, communityBody);

    res.status(201).json({ challenge: created });
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.patch("/challenges/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.challengerId !== userId) { res.status(403).json({ error: "Solo el retador puede modificar" }); return; }
    if (!["pending", "accepted"].includes(challenge.status)) {
      res.status(400).json({ error: "Solo se pueden modificar retos pendientes o activos" }); return;
    }

    const { trainingSystemId, scheduledAt, notes } = req.body as {
      trainingSystemId?: number; scheduledAt?: string; notes?: string | null;
    };

    const updates: Record<string, unknown> = {};
    if (trainingSystemId) updates.trainingSystemId = trainingSystemId;
    if (scheduledAt) updates.scheduledAt = new Date(scheduledAt);
    if (notes !== undefined) updates.notes = notes?.trim() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nada que actualizar" }); return;
    }

    // If the challenge was accepted, reset to pending so challenged must re-accept
    const wasAccepted = challenge.status === "accepted";
    if (wasAccepted) {
      updates.status = "pending";
      updates.respondedAt = null;
      updates.cancelRequestedBy = null;
    }

    const [updated] = await db.update(challengesTable)
      .set(updates as Partial<typeof challengesTable.$inferInsert>)
      .where(eq(challengesTable.id, challengeId))
      .returning();

    const [challenger] = await db
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const challengerLabel = challenger?.nickname ?? challenger?.displayName ?? "El retador";

    const notifTitle = wasAccepted ? "Reto activo modificado" : "Reto modificado";
    const notifBody = wasAccepted
      ? `${challengerLabel} modificó las condiciones. Debes aceptar de nuevo.`
      : `${challengerLabel} modificó las condiciones del reto`;
    void createInAppNotification(challenge.challengedId, notifTitle, notifBody, userId);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Update challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/request-cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }
    if (challenge.status !== "accepted") {
      res.status(400).json({ error: "Solo se puede solicitar cancelación en retos activos" }); return;
    }
    if (challenge.cancelRequestedBy !== null) {
      res.status(400).json({ error: "Ya existe una solicitud de cancelación pendiente" }); return;
    }

    const [updated] = await db.update(challengesTable)
      .set({ cancelRequestedBy: userId } as Partial<typeof challengesTable.$inferInsert>)
      .where(eq(challengesTable.id, challengeId))
      .returning();

    const [requester] = await db
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const otherId = challenge.challengerId === userId ? challenge.challengedId : challenge.challengerId;
    const notifTitle = "Solicitud de cancelación";
    const notifBody = `${requester?.nickname ?? requester?.displayName ?? "Tu oponente"} quiere cancelar el reto. Confirma o rechaza.`;
    void createInAppNotification(otherId, notifTitle, notifBody, userId);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Request cancel error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/confirm-cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.cancelRequestedBy === null) {
      res.status(400).json({ error: "No hay solicitud de cancelación pendiente" }); return;
    }
    if (challenge.cancelRequestedBy === userId) {
      res.status(400).json({ error: "No puedes confirmar tu propia solicitud" }); return;
    }
    if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    const [confirmer] = await db
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    await db.delete(challengesTable).where(eq(challengesTable.id, challengeId));

    const notifTitle = "Reto eliminado";
    const notifBody = `${confirmer?.nickname ?? confirmer?.displayName ?? "Tu oponente"} aceptó cancelar el reto — el reto fue eliminado`;
    void createInAppNotification(challenge.cancelRequestedBy!, notifTitle, notifBody, userId);

    res.json({ deleted: true, challengeId });
  } catch (error) {
    console.error("Confirm cancel error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.post("/challenges/:id/decline-cancel", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const challengeId = Number(String(req.params.id));

    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }
    if (challenge.cancelRequestedBy === null) {
      res.status(400).json({ error: "No hay solicitud de cancelación pendiente" }); return;
    }
    if (challenge.cancelRequestedBy === userId) {
      res.status(400).json({ error: "No puedes rechazar tu propia solicitud" }); return;
    }
    if (challenge.challengerId !== userId && challenge.challengedId !== userId) {
      res.status(403).json({ error: "Sin permiso" }); return;
    }

    const [updated] = await db.update(challengesTable)
      .set({ cancelRequestedBy: null } as Partial<typeof challengesTable.$inferInsert>)
      .where(eq(challengesTable.id, challengeId))
      .returning();

    const [decliner] = await db
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

    const notifTitle = "Cancelación rechazada";
    const notifBody = `${decliner?.nickname ?? decliner?.displayName ?? "Tu oponente"} rechazó cancelar el reto. El reto continúa.`;
    void createInAppNotification(challenge.cancelRequestedBy!, notifTitle, notifBody, userId);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Decline cancel error:", error);
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
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const responderLabel = responder?.nickname ?? responder?.displayName ?? "El retado";
    const notifTitle = "Respuesta a tu reto";
    const notifBody = decision === "accepted"
      ? `${responderLabel} aceptó tu reto`
      : `${responderLabel} declinó tu reto`;

    void createInAppNotification(challenge.challengerId, notifTitle, notifBody, userId);

    // Notify entire community when a challenge is accepted
    if (decision === "accepted") {
      const [challengerUser] = await db
        .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
        .from(usersTable).where(eq(usersTable.id, challenge.challengerId)).limit(1);
      const challengerLabel = challengerUser?.nickname ?? challengerUser?.displayName ?? "su rival";
      const communityTitle = "⚔️ ¡Reto aceptado!";
      const communityBody = `${responderLabel} aceptó el reto de ${challengerLabel}. ¡Se viene la pelea!`;
      void notifyTarget(["todas"], communityTitle, communityBody);
    }

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
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, winnerId)).limit(1);
    const winnerLabel = winner?.nickname ?? winner?.displayName ?? "Un guerrero";

    const winnerTitle = "¡Ganaste el reto!";
    const winnerBody = "Felicidades, fuiste declarado ganador";
    const loserTitle = "Resultado del reto";
    const loserBody = `${winnerLabel} fue declarado ganador`;

    void createInAppNotification(winnerId, winnerTitle, winnerBody, userId);
    void createInAppNotification(loserId, loserTitle, loserBody, userId);

    // Notify entire community about the winner
    const [loser] = await db
      .select({ displayName: usersTable.displayName, nickname: usersTable.nickname })
      .from(usersTable).where(eq(usersTable.id, loserId)).limit(1);
    const loserLabel = loser?.nickname ?? loser?.displayName ?? "su rival";
    const communityTitle = "🏆 ¡Tenemos ganador!";
    const communityBody = `${winnerLabel} fue declarado ganador del reto contra ${loserLabel}. ¡Mira la repetición!`;
    void notifyTarget(["todas"], communityTitle, communityBody);

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Result challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.get("/admin/challenges", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const canManage = await isAdminOrProfesor(userId);
    if (!canManage) { res.status(403).json({ error: "Sin permiso" }); return; }

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
        videoUrl: challengesTable.videoUrl,
        createdAt: challengesTable.createdAt,
        trainingSystemName: trainingSystemsTable.name,
        challengerName: challengerUsers.displayName,
        challengerNickname: challengerUsers.nickname,
        challengedName: challengedUsers.displayName,
        challengedNickname: challengedUsers.nickname,
      })
      .from(challengesTable)
      .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
      .innerJoin(challengerUsers, eq(challengesTable.challengerId, challengerUsers.id))
      .innerJoin(challengedUsers, eq(challengesTable.challengedId, challengedUsers.id))
      .orderBy(desc(challengesTable.createdAt));

    res.json({ challenges: rows });
  } catch (error) {
    console.error("Admin get challenges error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.patch("/admin/challenges/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const canManage = await isAdminOrProfesor(userId);
    if (!canManage) { res.status(403).json({ error: "Sin permiso" }); return; }

    const challengeId = Number(String(req.params.id));
    const [challenge] = await db
      .select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }

    const { trainingSystemId, scheduledAt, notes, status, videoUrl } = req.body as {
      trainingSystemId?: number;
      scheduledAt?: string;
      notes?: string | null;
      status?: string;
      videoUrl?: string | null;
    };

    const validStatuses = ["pending", "accepted", "declined", "completed", "cancelled"];
    if (status && !validStatuses.includes(status)) {
      res.status(400).json({ error: "Estado inválido" }); return;
    }

    const updates: Record<string, unknown> = {};
    if (trainingSystemId) updates.trainingSystemId = trainingSystemId;
    if (scheduledAt) updates.scheduledAt = new Date(scheduledAt);
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (status) updates.status = status;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nada que actualizar" }); return;
    }

    const [updated] = await db.update(challengesTable)
      .set(updates as Partial<typeof challengesTable.$inferInsert>)
      .where(eq(challengesTable.id, challengeId))
      .returning();

    res.json({ challenge: updated });
  } catch (error) {
    console.error("Admin update challenge error:", error);
    res.status(500).json({ error: "Error interno" });
  }
});

challengesRouter.delete("/admin/challenges/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const canManage = await isAdminOrProfesor(userId);
    if (!canManage) { res.status(403).json({ error: "Sin permiso" }); return; }

    const challengeId = Number(String(req.params.id));
    const [challenge] = await db
      .select({ id: challengesTable.id })
      .from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
    if (!challenge) { res.status(404).json({ error: "Reto no encontrado" }); return; }

    await db.delete(challengesTable).where(eq(challengesTable.id, challengeId));
    res.json({ deleted: true });
  } catch (error) {
    console.error("Admin delete challenge error:", error);
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
