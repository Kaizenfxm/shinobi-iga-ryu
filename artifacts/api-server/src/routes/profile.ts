import { Router } from "express";
import {
  db,
  usersTable,
  userRolesTable,
  studentBeltsTable,
  beltDefinitionsTable,
  fightsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const profileRouter = Router();

profileRouter.get("/profile/me", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        isFighter: usersTable.isFighter,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, userId));

    const belts = await db
      .select({
        discipline: studentBeltsTable.discipline,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
        beltOrder: beltDefinitionsTable.orderIndex,
      })
      .from(studentBeltsTable)
      .innerJoin(beltDefinitionsTable, eq(studentBeltsTable.currentBeltId, beltDefinitionsTable.id))
      .where(eq(studentBeltsTable.userId, userId))
      .orderBy(asc(studentBeltsTable.discipline));

    let fightStats = null;
    if (user.isFighter) {
      const fights = await db
        .select({ result: fightsTable.result })
        .from(fightsTable)
        .where(eq(fightsTable.userId, userId));

      const total = fights.length;
      const victorias = fights.filter((f) => f.result === "victoria").length;
      const derrotas = fights.filter((f) => f.result === "derrota").length;
      const empates = fights.filter((f) => f.result === "empate").length;

      fightStats = {
        total,
        victorias,
        derrotas,
        empates,
        winPercentage: total > 0 ? Math.round((victorias / total) * 100) : 0,
      };
    }

    res.json({
      profile: {
        ...user,
        roles: roles.map((r) => r.role),
        belts,
        fightStats,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default profileRouter;
