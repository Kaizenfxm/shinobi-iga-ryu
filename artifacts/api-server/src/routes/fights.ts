import { Router } from "express";
import {
  db,
  usersTable,
  fightsTable,
  userRolesTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const fightsRouter = Router();

const requireAdminOrProfesor = (
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  next: Parameters<typeof requireAuth>[2]
) => {
  requireAuth(req, res, async () => {
    const userId = req.session.userId!;
    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, userId));
    const roleList = roles.map((r) => r.role);
    if (roleList.includes("admin") || roleList.includes("profesor")) {
      next();
    } else {
      res.status(403).json({ error: "Se requiere rol de admin o profesor" });
    }
  });
};

fightsRouter.put("/admin/users/:userId/fighter", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const { isFighter } = req.body;
    if (typeof isFighter !== "boolean") {
      res.status(400).json({ error: "Se requiere isFighter (boolean)" });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    await db
      .update(usersTable)
      .set({ isFighter, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ success: true, isFighter });
  } catch (error) {
    console.error("Toggle fighter mode error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

fightsRouter.post("/fights", requireAdminOrProfesor, async (req, res) => {
  try {
    const { userId, opponentName, eventName, fightDate, result, method, discipline, rounds, notes } = req.body;

    if (!userId || !opponentName || !fightDate || !result || !discipline) {
      res.status(400).json({ error: "Se requiere userId, opponentName, fightDate, result y discipline" });
      return;
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fightDate) || isNaN(Date.parse(fightDate))) {
      res.status(400).json({ error: "Fecha inválida (formato: YYYY-MM-DD)" });
      return;
    }

    if (typeof opponentName !== "string" || opponentName.trim().length === 0 || opponentName.length > 255) {
      res.status(400).json({ error: "Nombre de oponente inválido" });
      return;
    }

    if (rounds !== undefined && rounds !== null) {
      const parsedRounds = parseInt(rounds, 10);
      if (isNaN(parsedRounds) || parsedRounds < 1 || parsedRounds > 99) {
        res.status(400).json({ error: "Número de rounds inválido (1-99)" });
        return;
      }
    }

    const [targetUser] = await db
      .select({ id: usersTable.id, isFighter: usersTable.isFighter })
      .from(usersTable)
      .where(eq(usersTable.id, parsedUserId))
      .limit(1);

    if (!targetUser) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    if (!targetUser.isFighter) {
      res.status(400).json({ error: "El usuario no tiene modo peleador activado" });
      return;
    }

    const validResults = ["victoria", "derrota", "empate"] as const;
    if (!validResults.includes(result)) {
      res.status(400).json({ error: "Resultado inválido" });
      return;
    }

    const validDisciplines = ["mma", "box", "jiujitsu", "muay_thai", "ninjutsu", "otro"] as const;
    if (!validDisciplines.includes(discipline)) {
      res.status(400).json({ error: "Disciplina inválida" });
      return;
    }

    const validMethods = ["ko", "tko", "sumision", "decision", "decision_unanime", "decision_dividida", "descalificacion", "no_contest"] as const;
    if (method && !validMethods.includes(method)) {
      res.status(400).json({ error: "Método inválido" });
      return;
    }

    const [fight] = await db.insert(fightsTable).values({
      userId: parsedUserId,
      opponentName: opponentName.trim(),
      eventName: eventName?.trim() || null,
      fightDate,
      result,
      method: method || null,
      discipline,
      rounds: rounds ? parseInt(rounds, 10) : null,
      notes: notes?.trim() || null,
      registeredBy: req.session.userId!,
    }).returning();

    res.status(201).json({ fight });
  } catch (error) {
    console.error("Add fight error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

fightsRouter.get("/fights/user/:userId", requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const [targetUser] = await db
      .select({ id: usersTable.id, isFighter: usersTable.isFighter, displayName: usersTable.displayName })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!targetUser || !targetUser.isFighter) {
      res.status(404).json({ error: "Peleador no encontrado" });
      return;
    }

    const fights = await db
      .select()
      .from(fightsTable)
      .where(eq(fightsTable.userId, userId))
      .orderBy(desc(fightsTable.fightDate));

    const stats = {
      total: fights.length,
      victorias: fights.filter((f) => f.result === "victoria").length,
      derrotas: fights.filter((f) => f.result === "derrota").length,
      empates: fights.filter((f) => f.result === "empate").length,
      winPercentage: fights.length > 0
        ? Math.round((fights.filter((f) => f.result === "victoria").length / fights.length) * 100)
        : 0,
    };

    res.json({ fighter: { id: targetUser.id, displayName: targetUser.displayName }, fights, stats });
  } catch (error) {
    console.error("Get fight history error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

fightsRouter.get("/fights/me", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const [user] = await db
      .select({ id: usersTable.id, isFighter: usersTable.isFighter })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || !user.isFighter) {
      res.json({ isFighter: false, fights: [], stats: null });
      return;
    }

    const fights = await db
      .select()
      .from(fightsTable)
      .where(eq(fightsTable.userId, userId))
      .orderBy(desc(fightsTable.fightDate));

    const stats = {
      total: fights.length,
      victorias: fights.filter((f) => f.result === "victoria").length,
      derrotas: fights.filter((f) => f.result === "derrota").length,
      empates: fights.filter((f) => f.result === "empate").length,
      winPercentage: fights.length > 0
        ? Math.round((fights.filter((f) => f.result === "victoria").length / fights.length) * 100)
        : 0,
    };

    res.json({ isFighter: true, fights, stats });
  } catch (error) {
    console.error("Get my fights error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

fightsRouter.delete("/fights/:fightId", requireAdminOrProfesor, async (req, res) => {
  try {
    const fightId = parseInt(req.params.fightId as string, 10);
    if (isNaN(fightId)) {
      res.status(400).json({ error: "ID de pelea inválido" });
      return;
    }

    const [fight] = await db
      .select()
      .from(fightsTable)
      .where(eq(fightsTable.id, fightId))
      .limit(1);

    if (!fight) {
      res.status(404).json({ error: "Pelea no encontrada" });
      return;
    }

    await db.delete(fightsTable).where(eq(fightsTable.id, fightId));

    res.json({ success: true });
  } catch (error) {
    console.error("Delete fight error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default fightsRouter;
