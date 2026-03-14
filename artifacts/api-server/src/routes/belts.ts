import { Router } from "express";
import {
  db,
  usersTable,
  userRolesTable,
  beltDefinitionsTable,
  studentBeltsTable,
  beltHistoryTable,
  beltRequirementsTable,
} from "@workspace/db";
import { eq, and, asc, inArray, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const beltsRouter = Router();

beltsRouter.get("/belts/definitions", requireAuth, async (_req, res) => {
  try {
    const definitions = await db
      .select()
      .from(beltDefinitionsTable)
      .orderBy(asc(beltDefinitionsTable.discipline), asc(beltDefinitionsTable.orderIndex));

    res.json({ definitions });
  } catch (error) {
    console.error("Get belt definitions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/belts/me", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const myBelts = await db
      .select({
        id: studentBeltsTable.id,
        discipline: studentBeltsTable.discipline,
        currentBeltId: studentBeltsTable.currentBeltId,
        nextUnlocked: studentBeltsTable.nextUnlocked,
        unlockedAt: studentBeltsTable.unlockedAt,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
        beltOrder: beltDefinitionsTable.orderIndex,
        beltDescription: beltDefinitionsTable.description,
      })
      .from(studentBeltsTable)
      .innerJoin(beltDefinitionsTable, eq(studentBeltsTable.currentBeltId, beltDefinitionsTable.id))
      .where(eq(studentBeltsTable.userId, userId));

    const allDefinitions = await db
      .select()
      .from(beltDefinitionsTable)
      .orderBy(asc(beltDefinitionsTable.discipline), asc(beltDefinitionsTable.orderIndex));

    const beltsWithNext = await Promise.all(
      myBelts.map(async (belt) => {
        const nextBelt = allDefinitions.find(
          (d) => d.discipline === belt.discipline && d.orderIndex === belt.beltOrder + 1
        );

        let nextRequirements: { id: number; title: string; description: string | null; orderIndex: number }[] = [];
        if (belt.nextUnlocked && nextBelt) {
          nextRequirements = await db
            .select({
              id: beltRequirementsTable.id,
              title: beltRequirementsTable.title,
              description: beltRequirementsTable.description,
              orderIndex: beltRequirementsTable.orderIndex,
            })
            .from(beltRequirementsTable)
            .where(eq(beltRequirementsTable.beltId, nextBelt.id))
            .orderBy(asc(beltRequirementsTable.orderIndex));
        }

        return {
          discipline: belt.discipline,
          currentBelt: {
            id: belt.currentBeltId,
            name: belt.beltName,
            color: belt.beltColor,
            orderIndex: belt.beltOrder,
            description: belt.beltDescription,
          },
          nextUnlocked: belt.nextUnlocked,
          unlockedAt: belt.unlockedAt,
          nextBelt: nextBelt
            ? {
                id: nextBelt.id,
                name: nextBelt.name,
                color: nextBelt.color,
                orderIndex: nextBelt.orderIndex,
                description: nextBelt.description,
              }
            : null,
          nextRequirements,
        };
      })
    );

    const history = await db
      .select({
        id: beltHistoryTable.id,
        discipline: beltHistoryTable.discipline,
        beltId: beltHistoryTable.beltId,
        achievedAt: beltHistoryTable.achievedAt,
        notes: beltHistoryTable.notes,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
      })
      .from(beltHistoryTable)
      .innerJoin(beltDefinitionsTable, eq(beltHistoryTable.beltId, beltDefinitionsTable.id))
      .where(eq(beltHistoryTable.userId, userId))
      .orderBy(desc(beltHistoryTable.achievedAt));

    res.json({ belts: beltsWithNext, history });
  } catch (error) {
    console.error("Get my belts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/admin/belts/users", requireAdmin, async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        email: usersTable.email,
      })
      .from(usersTable);

    const allStudentBelts = await db
      .select({
        userId: studentBeltsTable.userId,
        discipline: studentBeltsTable.discipline,
        currentBeltId: studentBeltsTable.currentBeltId,
        nextUnlocked: studentBeltsTable.nextUnlocked,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
        beltOrder: beltDefinitionsTable.orderIndex,
      })
      .from(studentBeltsTable)
      .innerJoin(beltDefinitionsTable, eq(studentBeltsTable.currentBeltId, beltDefinitionsTable.id));

    const allRoles = await db
      .select({ userId: userRolesTable.userId, role: userRolesTable.role })
      .from(userRolesTable);

    const rolesByUser = new Map<number, string[]>();
    for (const r of allRoles) {
      const existing = rolesByUser.get(r.userId) || [];
      existing.push(r.role);
      rolesByUser.set(r.userId, existing);
    }

    const beltsByUser = new Map<number, typeof allStudentBelts>();
    for (const sb of allStudentBelts) {
      const existing = beltsByUser.get(sb.userId) || [];
      existing.push(sb);
      beltsByUser.set(sb.userId, existing);
    }

    const alumnoUsers = users.filter((u) => {
      const roles = rolesByUser.get(u.id) || [];
      return roles.includes("alumno");
    });

    const result = alumnoUsers.map((u) => ({
      ...u,
      roles: rolesByUser.get(u.id) || [],
      belts: (beltsByUser.get(u.id) || []).map((b) => ({
        discipline: b.discipline,
        currentBelt: {
          id: b.currentBeltId,
          name: b.beltName,
          color: b.beltColor,
          orderIndex: b.beltOrder,
        },
        nextUnlocked: b.nextUnlocked,
      })),
    }));

    res.json({ users: result });
  } catch (error) {
    console.error("Admin get belt users error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/admin/belts/users/:userId/history", requireAdmin, async (req, res) => {
  try {
    const userIdParam = req.params.userId;
    const userId = parseInt(Array.isArray(userIdParam) ? userIdParam[0] : userIdParam, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const history = await db
      .select({
        id: beltHistoryTable.id,
        discipline: beltHistoryTable.discipline,
        beltId: beltHistoryTable.beltId,
        achievedAt: beltHistoryTable.achievedAt,
        notes: beltHistoryTable.notes,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
      })
      .from(beltHistoryTable)
      .innerJoin(beltDefinitionsTable, eq(beltHistoryTable.beltId, beltDefinitionsTable.id))
      .where(eq(beltHistoryTable.userId, userId))
      .orderBy(desc(beltHistoryTable.achievedAt));

    res.json({ history });
  } catch (error) {
    console.error("Admin get belt history error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/admin/belts/unlock", requireAdmin, async (req, res) => {
  try {
    const { userId, discipline } = req.body;

    if (!userId || !discipline) {
      res.status(400).json({ error: "Se requiere userId y discipline" });
      return;
    }

    const validDisciplines = ["ninjutsu", "jiujitsu"] as const;
    if (!validDisciplines.includes(discipline as typeof validDisciplines[number])) {
      res.status(400).json({ error: "Disciplina inválida" });
      return;
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const [studentBelt] = await db
      .select()
      .from(studentBeltsTable)
      .where(
        and(
          eq(studentBeltsTable.userId, parsedUserId),
          eq(studentBeltsTable.discipline, discipline as typeof validDisciplines[number])
        )
      )
      .limit(1);

    if (!studentBelt) {
      res.status(404).json({ error: "No se encontró el cinturón del alumno" });
      return;
    }

    const currentBelt = await db
      .select()
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.id, studentBelt.currentBeltId))
      .limit(1);

    const nextBelt = await db
      .select()
      .from(beltDefinitionsTable)
      .where(
        and(
          eq(beltDefinitionsTable.discipline, discipline as typeof validDisciplines[number]),
          eq(beltDefinitionsTable.orderIndex, currentBelt[0].orderIndex + 1)
        )
      )
      .limit(1);

    if (nextBelt.length === 0) {
      res.status(400).json({ error: "El alumno ya tiene el cinturón más alto" });
      return;
    }

    await db
      .update(studentBeltsTable)
      .set({ nextUnlocked: true, unlockedAt: new Date() })
      .where(eq(studentBeltsTable.id, studentBelt.id));

    res.json({ success: true, nextBelt: nextBelt[0] });
  } catch (error) {
    console.error("Admin unlock belt error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/admin/belts/promote", requireAdmin, async (req, res) => {
  try {
    const { userId, discipline } = req.body;

    if (!userId || !discipline) {
      res.status(400).json({ error: "Se requiere userId y discipline" });
      return;
    }

    const validDisciplines = ["ninjutsu", "jiujitsu"] as const;
    if (!validDisciplines.includes(discipline as typeof validDisciplines[number])) {
      res.status(400).json({ error: "Disciplina inválida" });
      return;
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const [studentBelt] = await db
      .select()
      .from(studentBeltsTable)
      .where(
        and(
          eq(studentBeltsTable.userId, parsedUserId),
          eq(studentBeltsTable.discipline, discipline as typeof validDisciplines[number])
        )
      )
      .limit(1);

    if (!studentBelt) {
      res.status(404).json({ error: "No se encontró el cinturón del alumno" });
      return;
    }

    if (!studentBelt.nextUnlocked) {
      res.status(400).json({ error: "El siguiente nivel no está desbloqueado. Debes desbloquear primero." });
      return;
    }

    const currentBelt = await db
      .select()
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.id, studentBelt.currentBeltId))
      .limit(1);

    const [nextBelt] = await db
      .select()
      .from(beltDefinitionsTable)
      .where(
        and(
          eq(beltDefinitionsTable.discipline, discipline as typeof validDisciplines[number]),
          eq(beltDefinitionsTable.orderIndex, currentBelt[0].orderIndex + 1)
        )
      )
      .limit(1);

    if (!nextBelt) {
      res.status(400).json({ error: "El alumno ya tiene el cinturón más alto" });
      return;
    }

    const adminId = req.session.userId!;

    await db
      .update(studentBeltsTable)
      .set({
        currentBeltId: nextBelt.id,
        nextUnlocked: false,
        unlockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(studentBeltsTable.id, studentBelt.id));

    await db.insert(beltHistoryTable).values({
      userId: parsedUserId,
      discipline: discipline as typeof validDisciplines[number],
      beltId: nextBelt.id,
      promotedBy: adminId,
      notes: `Promovido a ${nextBelt.name}`,
    });

    res.json({
      success: true,
      newBelt: {
        id: nextBelt.id,
        name: nextBelt.name,
        color: nextBelt.color,
        orderIndex: nextBelt.orderIndex,
      },
    });
  } catch (error) {
    console.error("Admin promote belt error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default beltsRouter;
