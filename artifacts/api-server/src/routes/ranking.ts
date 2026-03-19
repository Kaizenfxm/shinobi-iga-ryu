import { Router } from "express";
import { db, usersTable, fightsTable, classAttendancesTable, challengesTable } from "@workspace/db";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const rankingRouter = Router();

async function getActiveAlumnoIds(): Promise<number[]> {
  const rows = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(
      eq(usersTable.membershipStatus, "activo"),
      eq(usersTable.hiddenFromCommunity, false),
    ));
  return rows.map((r) => r.id);
}

rankingRouter.get("/ranking/fighters", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();
  if (activeIds.length === 0) {
    res.json({ ranking: [] });
    return;
  }

  const stats = await db
    .select({
      userId: fightsTable.userId,
      wins: sql<number>`count(*) filter (where ${fightsTable.result} = 'victoria')`.as("wins"),
      losses: sql<number>`count(*) filter (where ${fightsTable.result} = 'derrota')`.as("losses"),
      draws: sql<number>`count(*) filter (where ${fightsTable.result} = 'empate')`.as("draws"),
    })
    .from(fightsTable)
    .where(inArray(fightsTable.userId, activeIds))
    .groupBy(fightsTable.userId);

  const statsMap = new Map(stats.map((s) => [s.userId, s]));

  const users = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, activeIds));

  const ranking = users
    .map((u) => {
      const s = statsMap.get(u.id);
      return {
        userId: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        wins: Number(s?.wins ?? 0),
        losses: Number(s?.losses ?? 0),
        draws: Number(s?.draws ?? 0),
      };
    })
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  res.json({ ranking });
});

rankingRouter.get("/ranking/attendance", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();
  if (activeIds.length === 0) {
    res.json({ ranking: [], month: "" });
    return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthLabel = now.toLocaleString("es-CO", { month: "long", year: "numeric" });

  const stats = await db
    .select({
      userId: classAttendancesTable.userId,
      total: count(classAttendancesTable.id),
    })
    .from(classAttendancesTable)
    .where(
      and(
        inArray(classAttendancesTable.userId, activeIds),
        sql`${classAttendancesTable.attendedAt} >= ${monthStart.toISOString()}`,
        sql`${classAttendancesTable.attendedAt} < ${monthEnd.toISOString()}`
      )
    )
    .groupBy(classAttendancesTable.userId);

  const statsMap = new Map(stats.map((s) => [s.userId, Number(s.total)]));

  const users = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, activeIds));

  const ranking = users
    .map((u) => ({
      userId: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      attendances: statsMap.get(u.id) ?? 0,
    }))
    .sort((a, b) => b.attendances - a.attendances)
    .filter((u) => u.attendances > 0);

  res.json({ ranking, month: monthLabel });
});

rankingRouter.get("/ranking/challenges", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();
  if (activeIds.length === 0) {
    res.json({ ranking: [] });
    return;
  }

  const stats = await db
    .select({
      userId: challengesTable.winnerId,
      wins: count(challengesTable.id),
    })
    .from(challengesTable)
    .where(
      and(
        eq(challengesTable.status, "completed"),
        inArray(challengesTable.winnerId, activeIds)
      )
    )
    .groupBy(challengesTable.winnerId);

  const statsMap = new Map(stats.map((s) => [s.userId!, Number(s.wins)]));

  const users = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, activeIds));

  const ranking = users
    .map((u) => ({
      userId: u.id,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      wins: statsMap.get(u.id) ?? 0,
    }))
    .filter((u) => u.wins > 0)
    .sort((a, b) => b.wins - a.wins);

  res.json({ ranking });
});

export default rankingRouter;
