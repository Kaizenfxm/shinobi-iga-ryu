import { Router } from "express";
import {
  db,
  classesTable,
  classTrainingSystemsTable,
  classAttendancesTable,
  trainingSystemsTable,
  usersTable,
  userRolesTable,
} from "@workspace/db";
import { eq, and, or, sql, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const ratingsRouter = Router();

async function isAdminOrProfesor(userId: number): Promise<boolean> {
  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(
      and(
        eq(userRolesTable.userId, userId),
        or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
      )
    );
  return roles.length > 0;
}

async function ensurePrivileged(userId: number, res: any): Promise<boolean> {
  const ok = await isAdminOrProfesor(userId);
  if (!ok) {
    res.status(403).json({ error: "Acceso no autorizado" });
    return false;
  }
  return true;
}

ratingsRouter.get("/ratings/summary", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await ensurePrivileged(userId, res))) return;

    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        avg: sql<number | null>`avg(${classAttendancesTable.rating})::float`,
      })
      .from(classAttendancesTable)
      .where(isNotNull(classAttendancesTable.rating));

    res.json({
      totalRatings: row?.total ?? 0,
      avgGlobal: row?.avg ?? null,
    });
  } catch (error) {
    console.error("Ratings summary error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

ratingsRouter.get("/ratings/professors", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await ensurePrivileged(userId, res))) return;

    const rows = await db
      .select({
        professorId: classesTable.professorUserId,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        avgRating: sql<number>`avg(${classAttendancesTable.rating})::float`,
        totalRatings: sql<number>`count(${classAttendancesTable.rating})::int`,
      })
      .from(classAttendancesTable)
      .innerJoin(classesTable, eq(classAttendancesTable.classId, classesTable.id))
      .innerJoin(usersTable, eq(classesTable.professorUserId, usersTable.id))
      .where(isNotNull(classAttendancesTable.rating))
      .groupBy(classesTable.professorUserId, usersTable.displayName, usersTable.avatarUrl)
      .orderBy(sql`avg(${classAttendancesTable.rating}) desc nulls last`);

    res.json({
      professors: rows.map((r) => ({
        professorId: r.professorId,
        displayName: r.displayName,
        avatarUrl: r.avatarUrl,
        avgRating: r.avgRating,
        totalRatings: r.totalRatings,
      })),
    });
  } catch (error) {
    console.error("Ratings professors error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

ratingsRouter.get("/ratings/martial-arts", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await ensurePrivileged(userId, res))) return;

    const rows = await db
      .select({
        systemId: trainingSystemsTable.id,
        key: trainingSystemsTable.key,
        name: trainingSystemsTable.name,
        avgRating: sql<number>`avg(${classAttendancesTable.rating})::float`,
        totalRatings: sql<number>`count(${classAttendancesTable.rating})::int`,
      })
      .from(classAttendancesTable)
      .innerJoin(
        classTrainingSystemsTable,
        eq(classAttendancesTable.classId, classTrainingSystemsTable.classId)
      )
      .innerJoin(
        trainingSystemsTable,
        eq(classTrainingSystemsTable.trainingSystemId, trainingSystemsTable.id)
      )
      .where(isNotNull(classAttendancesTable.rating))
      .groupBy(trainingSystemsTable.id, trainingSystemsTable.key, trainingSystemsTable.name)
      .orderBy(sql`avg(${classAttendancesTable.rating}) desc nulls last`);

    res.json({
      martialArts: rows.map((r) => ({
        systemId: r.systemId,
        key: r.key,
        name: r.name,
        avgRating: r.avgRating,
        totalRatings: r.totalRatings,
      })),
    });
  } catch (error) {
    console.error("Ratings martial arts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default ratingsRouter;
