import { Router } from "express";
import { db, usersTable, fightsTable, classAttendancesTable, challengesTable, studentBeltsTable, beltDefinitionsTable, trainingSystemsTable } from "@workspace/db";
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
      eq(usersTable.isDeleted, false),
    ));
  return rows.map((r) => r.id);
}

type BeltInfo = { name: string; color: string };
type BeltEntry = { ninjutsu?: BeltInfo; jiujitsu?: BeltInfo };

async function getBeltsForUsers(userIds: number[]): Promise<Map<number, BeltEntry>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({
      userId: studentBeltsTable.userId,
      discipline: studentBeltsTable.discipline,
      beltName: beltDefinitionsTable.name,
      beltColor: beltDefinitionsTable.color,
    })
    .from(studentBeltsTable)
    .innerJoin(beltDefinitionsTable, eq(studentBeltsTable.currentBeltId, beltDefinitionsTable.id))
    .where(inArray(studentBeltsTable.userId, userIds));

  const map = new Map<number, BeltEntry>();
  for (const row of rows) {
    const entry = map.get(row.userId) ?? {};
    if (row.discipline === "ninjutsu") entry.ninjutsu = { name: row.beltName, color: row.beltColor };
    if (row.discipline === "jiujitsu") entry.jiujitsu = { name: row.beltName, color: row.beltColor };
    map.set(row.userId, entry);
  }
  return map;
}

rankingRouter.get("/ranking/fighters", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();
  if (activeIds.length === 0) { res.json({ ranking: [] }); return; }

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

  const beltMap = await getBeltsForUsers(activeIds);

  const ranking = users
    .map((u) => {
      const s = statsMap.get(u.id);
      const belts = beltMap.get(u.id);
      return {
        userId: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        wins: Number(s?.wins ?? 0),
        losses: Number(s?.losses ?? 0),
        draws: Number(s?.draws ?? 0),
        ninjutsuBelt: belts?.ninjutsu ?? null,
        jiujitsuBelt: belts?.jiujitsu ?? null,
      };
    })
    .filter((u) => u.wins + u.losses + u.draws > 0)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

  res.json({ ranking });
});

rankingRouter.get("/ranking/attendance", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();

  const periodParam = String(req.query["period"] ?? "month") === "year" ? "year" : "month";
  const monthParam = typeof req.query["month"] === "string" ? (req.query["month"] as string) : null;
  const yearParam = typeof req.query["year"] === "string" ? Number(req.query["year"]) : NaN;

  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;
  let label: string;
  let monthValue = "";
  let yearValue = 0;

  if (periodParam === "year") {
    const y = Number.isFinite(yearParam) && yearParam > 1970 ? yearParam : now.getFullYear();
    rangeStart = new Date(y, 0, 1);
    rangeEnd = new Date(y + 1, 0, 1);
    yearValue = y;
    label = String(y);
  } else {
    let y = now.getFullYear();
    let m = now.getMonth();
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [yy, mm] = monthParam.split("-").map(Number);
      if (yy > 1970 && mm >= 1 && mm <= 12) {
        y = yy;
        m = mm - 1;
      }
    }
    rangeStart = new Date(y, m, 1);
    rangeEnd = new Date(y, m + 1, 1);
    monthValue = `${y}-${String(m + 1).padStart(2, "0")}`;
    yearValue = y;
    label = rangeStart.toLocaleString("es-CO", { month: "long", year: "numeric" });
  }

  if (activeIds.length === 0) {
    res.json({ ranking: [], month: label, period: periodParam, monthValue, yearValue, label });
    return;
  }

  const stats = await db
    .select({ userId: classAttendancesTable.userId, total: count(classAttendancesTable.id) })
    .from(classAttendancesTable)
    .where(and(
      inArray(classAttendancesTable.userId, activeIds),
      sql`${classAttendancesTable.attendedAt} >= ${rangeStart.toISOString()}`,
      sql`${classAttendancesTable.attendedAt} < ${rangeEnd.toISOString()}`
    ))
    .groupBy(classAttendancesTable.userId);

  const statsMap = new Map(stats.map((s) => [s.userId, Number(s.total)]));

  const users = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, activeIds));

  const beltMap = await getBeltsForUsers(activeIds);

  const ranking = users
    .map((u) => {
      const belts = beltMap.get(u.id);
      return {
        userId: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        attendances: statsMap.get(u.id) ?? 0,
        ninjutsuBelt: belts?.ninjutsu ?? null,
        jiujitsuBelt: belts?.jiujitsu ?? null,
      };
    })
    .sort((a, b) => b.attendances - a.attendances)
    .filter((u) => u.attendances > 0);

  res.json({ ranking, month: label, period: periodParam, monthValue, yearValue, label });
});

rankingRouter.get("/ranking/challenges", requireAuth, async (req, res) => {
  const activeIds = await getActiveAlumnoIds();
  if (activeIds.length === 0) { res.json({ ranking: [] }); return; }

  const wonRows = await db
    .select({
      id: challengesTable.id,
      winnerId: challengesTable.winnerId,
      challengerId: challengesTable.challengerId,
      challengedId: challengesTable.challengedId,
      scheduledAt: challengesTable.scheduledAt,
      artName: trainingSystemsTable.name,
    })
    .from(challengesTable)
    .innerJoin(trainingSystemsTable, eq(challengesTable.trainingSystemId, trainingSystemsTable.id))
    .where(and(eq(challengesTable.status, "completed"), inArray(challengesTable.winnerId, activeIds)));

  const opponentIds = [...new Set(wonRows.map((c) =>
    c.winnerId === c.challengerId ? c.challengedId : c.challengerId
  ))];

  const opponents = opponentIds.length > 0
    ? await db.select({ id: usersTable.id, displayName: usersTable.displayName }).from(usersTable).where(inArray(usersTable.id, opponentIds))
    : [];
  const opponentMap = new Map(opponents.map((o) => [o.id, o.displayName]));

  const challengesByWinner = new Map<number, Array<{ id: number; opponentName: string; artName: string; scheduledAt: string }>>();
  for (const c of wonRows) {
    const opponentId = c.winnerId === c.challengerId ? c.challengedId : c.challengerId;
    const list = challengesByWinner.get(c.winnerId!) ?? [];
    list.push({
      id: c.id,
      opponentName: opponentMap.get(opponentId) ?? "Desconocido",
      artName: c.artName,
      scheduledAt: c.scheduledAt.toISOString(),
    });
    challengesByWinner.set(c.winnerId!, list);
  }

  const users = await db
    .select({ id: usersTable.id, displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(inArray(usersTable.id, activeIds));

  const beltMap = await getBeltsForUsers(activeIds);

  const ranking = users
    .map((u) => {
      const won = challengesByWinner.get(u.id) ?? [];
      const belts = beltMap.get(u.id);
      return {
        userId: u.id,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        wins: won.length,
        wonChallenges: won,
        ninjutsuBelt: belts?.ninjutsu ?? null,
        jiujitsuBelt: belts?.jiujitsu ?? null,
      };
    })
    .filter((u) => u.wins > 0)
    .sort((a, b) => b.wins - a.wins);

  res.json({ ranking });
});

export default rankingRouter;
