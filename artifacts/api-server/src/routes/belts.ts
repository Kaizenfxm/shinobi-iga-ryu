import { Router } from "express";
import {
  db,
  usersTable,
  userRolesTable,
  beltDefinitionsTable,
  studentBeltsTable,
  beltHistoryTable,
  beltRequirementsTable,
  beltExamsTable,
  studentBeltUnlocksTable,
  beltApplicationsTable,
  studentRequirementChecksTable,
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

    const allRequirements = await db
      .select()
      .from(beltRequirementsTable)
      .orderBy(asc(beltRequirementsTable.beltId), asc(beltRequirementsTable.orderIndex));

    const myApplications = await db
      .select()
      .from(beltApplicationsTable)
      .where(eq(beltApplicationsTable.userId, userId));

    const myChecks = await db
      .select()
      .from(studentRequirementChecksTable)
      .where(eq(studentRequirementChecksTable.userId, userId));

    const checkedReqIds = new Set(myChecks.map((c) => c.requirementId));
    const reqsByBeltId = new Map<number, typeof allRequirements>();
    for (const req of allRequirements) {
      const existing = reqsByBeltId.get(req.beltId) ?? [];
      existing.push(req);
      reqsByBeltId.set(req.beltId, existing);
    }

    const applicationsByDiscipline = new Map<string, typeof myApplications[0]>();
    for (const app of myApplications) {
      applicationsByDiscipline.set(app.discipline, app);
    }

    const validDisciplines = ["ninjutsu", "jiujitsu"] as const;

    const beltsWithNext = await Promise.all(
      validDisciplines.map(async (discipline) => {
        const belt = myBelts.find((b) => b.discipline === discipline);
        const disciplineDefs = allDefinitions.filter((d) => d.discipline === discipline);

        if (!belt || disciplineDefs.length === 0) {
          const firstBelt = disciplineDefs[0] ?? null;
          const firstApp = firstBelt ? applicationsByDiscipline.get(discipline) : null;
          const firstApplied = !!(firstApp && firstBelt && firstApp.targetBeltId === firstBelt.id);

          const ladder = disciplineDefs.map((def) => {
            let status: "earned" | "current" | "available" | "applied" | "locked";
            if (firstBelt && def.id === firstBelt.id) {
              status = firstApplied ? "applied" : "available";
            } else {
              status = "locked";
            }
            return {
              id: def.id,
              name: def.name,
              color: def.color,
              orderIndex: def.orderIndex,
              description: def.description,
              status,
              requirements: (reqsByBeltId.get(def.id) ?? []).map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                orderIndex: r.orderIndex,
                checked: checkedReqIds.has(r.id),
              })),
            };
          });

          return {
            discipline,
            currentBelt: null,
            nextUnlocked: false,
            unlockedAt: null,
            applied: firstApplied,
            ladder,
            nextBelt: firstBelt
              ? {
                  id: firstBelt.id,
                  name: firstBelt.name,
                  color: firstBelt.color,
                  orderIndex: firstBelt.orderIndex,
                  description: firstBelt.description,
                }
              : null,
            nextRequirements: firstBelt
              ? (reqsByBeltId.get(firstBelt.id) ?? []).map((r) => ({
                  id: r.id,
                  title: r.title,
                  description: r.description,
                  orderIndex: r.orderIndex,
                }))
              : [],
            nextExam: null,
          };
        }

        const nextBelt = disciplineDefs.find((d) => d.orderIndex === belt.beltOrder + 1);
        const existingApp = applicationsByDiscipline.get(discipline);
        const applied = !!existingApp && existingApp.targetBeltId === nextBelt?.id;

        let nextRequirements: { id: number; title: string; description: string | null; orderIndex: number }[] = [];
        let nextExam: { id: number; title: string; description: string | null; durationMinutes: number | null; passingScore: number | null } | null = null;

        if (nextBelt) {
          nextRequirements = (reqsByBeltId.get(nextBelt.id) ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            orderIndex: r.orderIndex,
          }));

          if (belt.nextUnlocked || applied) {
            const [exam] = await db
              .select({
                id: beltExamsTable.id,
                title: beltExamsTable.title,
                description: beltExamsTable.description,
                durationMinutes: beltExamsTable.durationMinutes,
                passingScore: beltExamsTable.passingScore,
              })
              .from(beltExamsTable)
              .where(eq(beltExamsTable.beltId, nextBelt.id))
              .limit(1);
            nextExam = exam || null;
          }
        }

        const ladder = disciplineDefs.map((def) => {
          let status: "earned" | "current" | "available" | "applied" | "locked";
          if (def.orderIndex < belt.beltOrder) {
            status = "earned";
          } else if (def.orderIndex === belt.beltOrder) {
            status = "current";
          } else if (def.orderIndex === belt.beltOrder + 1) {
            if (applied) {
              status = "applied";
            } else {
              status = "available";
            }
          } else {
            status = "locked";
          }

          const reqs = (reqsByBeltId.get(def.id) ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            orderIndex: r.orderIndex,
            checked: checkedReqIds.has(r.id),
          }));

          return {
            id: def.id,
            name: def.name,
            color: def.color,
            orderIndex: def.orderIndex,
            description: def.description,
            status,
            requirements: reqs,
          };
        });

        return {
          discipline,
          currentBelt: {
            id: belt.currentBeltId,
            name: belt.beltName,
            color: belt.beltColor,
            orderIndex: belt.beltOrder,
            description: belt.beltDescription,
          },
          nextUnlocked: belt.nextUnlocked,
          unlockedAt: belt.unlockedAt,
          applied,
          ladder,
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
          nextExam,
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

beltsRouter.post("/belts/apply", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { discipline } = req.body as { discipline: string };

    if (!discipline || !["ninjutsu", "jiujitsu"].includes(discipline)) {
      res.status(400).json({ error: "Disciplina inválida" });
      return;
    }

    const disc = discipline as "ninjutsu" | "jiujitsu";

    const [studentBelt] = await db
      .select()
      .from(studentBeltsTable)
      .where(and(eq(studentBeltsTable.userId, userId), eq(studentBeltsTable.discipline, disc)))
      .limit(1);

    if (!studentBelt) {
      const [firstBelt] = await db
        .select()
        .from(beltDefinitionsTable)
        .where(and(eq(beltDefinitionsTable.discipline, disc), eq(beltDefinitionsTable.orderIndex, 0)))
        .limit(1);

      if (!firstBelt) {
        res.status(404).json({ error: "No hay cinturones definidos para esta disciplina" });
        return;
      }

      const existingApp = await db
        .select()
        .from(beltApplicationsTable)
        .where(
          and(
            eq(beltApplicationsTable.userId, userId),
            eq(beltApplicationsTable.discipline, disc),
            eq(beltApplicationsTable.targetBeltId, firstBelt.id)
          )
        )
        .limit(1);

      if (existingApp.length > 0) {
        res.json({ success: true, alreadyApplied: true });
        return;
      }

      if (disc === "jiujitsu") {
        await db.transaction(async (tx) => {
          await tx.insert(studentBeltsTable).values({
            userId,
            discipline: disc,
            currentBeltId: firstBelt.id,
            nextUnlocked: false,
          });
          await tx.insert(beltHistoryTable).values({
            userId,
            discipline: disc,
            beltId: firstBelt.id,
            promotedBy: userId,
            notes: "Cinturón blanco: inscripción automática",
          });
        });
        res.json({ success: true, alreadyApplied: false, autoPromoted: true, targetBelt: firstBelt });
        return;
      }

      await db.insert(beltApplicationsTable).values({
        userId,
        discipline: disc,
        targetBeltId: firstBelt.id,
        status: "pending",
      });
      res.json({ success: true, alreadyApplied: false, targetBelt: firstBelt });
      return;
    }

    const [currentDef] = await db
      .select()
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.id, studentBelt.currentBeltId))
      .limit(1);

    const [nextBelt] = await db
      .select()
      .from(beltDefinitionsTable)
      .where(
        and(
          eq(beltDefinitionsTable.discipline, disc),
          eq(beltDefinitionsTable.orderIndex, currentDef.orderIndex + 1)
        )
      )
      .limit(1);

    if (!nextBelt) {
      res.status(400).json({ error: "Ya tienes el grado máximo en esta disciplina" });
      return;
    }

    const existing = await db
      .select()
      .from(beltApplicationsTable)
      .where(
        and(
          eq(beltApplicationsTable.userId, userId),
          eq(beltApplicationsTable.discipline, disc),
          eq(beltApplicationsTable.targetBeltId, nextBelt.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.json({ success: true, alreadyApplied: true });
      return;
    }

    await db.insert(beltApplicationsTable).values({
      userId,
      discipline: disc,
      targetBeltId: nextBelt.id,
      status: "pending",
    });

    res.json({ success: true, alreadyApplied: false, targetBelt: nextBelt });
  } catch (error) {
    console.error("Belt apply error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/belts/requirements/:requirementId/toggle", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const requirementId = parseInt(req.params.requirementId as string, 10);
    if (isNaN(requirementId)) {
      res.status(400).json({ error: "ID de requerimiento inválido" });
      return;
    }

    const existing = await db
      .select()
      .from(studentRequirementChecksTable)
      .where(
        and(
          eq(studentRequirementChecksTable.userId, userId),
          eq(studentRequirementChecksTable.requirementId, requirementId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .delete(studentRequirementChecksTable)
        .where(
          and(
            eq(studentRequirementChecksTable.userId, userId),
            eq(studentRequirementChecksTable.requirementId, requirementId)
          )
        );
      res.json({ checked: false });
    } else {
      await db.insert(studentRequirementChecksTable).values({ userId, requirementId });
      res.json({ checked: true });
    }
  } catch (error) {
    console.error("Toggle requirement check error:", error);
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
    const userId = parseInt(req.params.userId as string, 10);
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

    const adminId = req.session.userId!;

    await db.transaction(async (tx) => {
      await tx
        .update(studentBeltsTable)
        .set({ nextUnlocked: true, unlockedAt: new Date() })
        .where(eq(studentBeltsTable.id, studentBelt.id));

      await tx.insert(studentBeltUnlocksTable).values({
        userId: parsedUserId,
        discipline: discipline as typeof validDisciplines[number],
        targetBeltId: nextBelt[0].id,
        unlockedBy: adminId,
        notes: `Desbloqueado nivel ${nextBelt[0].name}`,
      });
    });

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

    await db.transaction(async (tx) => {
      await tx
        .update(studentBeltsTable)
        .set({
          currentBeltId: nextBelt.id,
          nextUnlocked: false,
          unlockedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(studentBeltsTable.id, studentBelt.id));

      await tx.insert(beltHistoryTable).values({
        userId: parsedUserId,
        discipline: discipline as typeof validDisciplines[number],
        beltId: nextBelt.id,
        promotedBy: adminId,
        notes: `Promovido a ${nextBelt.name}`,
      });
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

beltsRouter.post("/admin/belts/initialize", requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: "Se requiere userId" });
      return;
    }

    const parsedUserId = parseInt(userId, 10);
    if (isNaN(parsedUserId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const disciplines = ["ninjutsu", "jiujitsu"] as const;
    const initialized: string[] = [];

    await db.transaction(async (tx) => {
      for (const discipline of disciplines) {
        const existing = await tx
          .select()
          .from(studentBeltsTable)
          .where(
            and(
              eq(studentBeltsTable.userId, parsedUserId),
              eq(studentBeltsTable.discipline, discipline)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          const [whiteBelt] = await tx
            .select()
            .from(beltDefinitionsTable)
            .where(
              and(
                eq(beltDefinitionsTable.discipline, discipline),
                eq(beltDefinitionsTable.orderIndex, 0)
              )
            )
            .limit(1);

          if (whiteBelt) {
            await tx.insert(studentBeltsTable).values({
              userId: parsedUserId,
              discipline,
              currentBeltId: whiteBelt.id,
              nextUnlocked: false,
            });

            await tx.insert(beltHistoryTable).values({
              userId: parsedUserId,
              discipline,
              beltId: whiteBelt.id,
              promotedBy: req.session.userId!,
              notes: "Cinturón inicial asignado por administrador",
            });

            initialized.push(discipline);
          }
        }
      }
    });

    res.json({ success: true, initialized });
  } catch (error) {
    console.error("Admin initialize belts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/admin/belts/unlocks/:userId", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId as string, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const unlocks = await db
      .select({
        id: studentBeltUnlocksTable.id,
        discipline: studentBeltUnlocksTable.discipline,
        targetBeltId: studentBeltUnlocksTable.targetBeltId,
        unlockedAt: studentBeltUnlocksTable.unlockedAt,
        notes: studentBeltUnlocksTable.notes,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
        unlockedByName: usersTable.displayName,
      })
      .from(studentBeltUnlocksTable)
      .innerJoin(beltDefinitionsTable, eq(studentBeltUnlocksTable.targetBeltId, beltDefinitionsTable.id))
      .innerJoin(usersTable, eq(studentBeltUnlocksTable.unlockedBy, usersTable.id))
      .where(eq(studentBeltUnlocksTable.userId, userId))
      .orderBy(desc(studentBeltUnlocksTable.unlockedAt));

    res.json({ unlocks });
  } catch (error) {
    console.error("Admin get unlock records error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/admin/belts/catalog", requireAdmin, async (_req, res) => {
  try {
    const definitions = await db
      .select()
      .from(beltDefinitionsTable)
      .orderBy(asc(beltDefinitionsTable.discipline), asc(beltDefinitionsTable.orderIndex));

    const requirements = await db
      .select()
      .from(beltRequirementsTable)
      .orderBy(asc(beltRequirementsTable.beltId), asc(beltRequirementsTable.orderIndex));

    const reqsByBeltId: Record<number, typeof requirements> = {};
    for (const req of requirements) {
      if (!reqsByBeltId[req.beltId]) reqsByBeltId[req.beltId] = [];
      reqsByBeltId[req.beltId].push(req);
    }

    const disciplineMap: Record<string, typeof definitions> = {};
    for (const belt of definitions) {
      if (!disciplineMap[belt.discipline]) disciplineMap[belt.discipline] = [];
      disciplineMap[belt.discipline].push(belt);
    }

    const catalog = (["ninjutsu", "jiujitsu"] as const).map((disc) => ({
      discipline: disc,
      belts: (disciplineMap[disc] || []).map((belt) => ({
        ...belt,
        requirements: reqsByBeltId[belt.id] || [],
      })),
    }));

    res.json({ catalog });
  } catch (error) {
    console.error("Admin get catalog error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/admin/belts/definitions", requireAdmin, async (req, res) => {
  try {
    const { discipline, name, color, description } = req.body as {
      discipline: "ninjutsu" | "jiujitsu";
      name: string;
      color: string;
      description?: string;
    };

    if (!discipline || !name?.trim() || !color?.trim()) {
      res.status(400).json({ error: "discipline, name y color son requeridos" });
      return;
    }
    if (!["ninjutsu", "jiujitsu"].includes(discipline)) {
      res.status(400).json({ error: "discipline inválida" });
      return;
    }

    const existing = await db
      .select({ orderIndex: beltDefinitionsTable.orderIndex })
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.discipline, discipline))
      .orderBy(desc(beltDefinitionsTable.orderIndex))
      .limit(1);

    const nextOrder = existing.length > 0 ? existing[0].orderIndex + 1 : 0;

    const [belt] = await db.insert(beltDefinitionsTable).values({
      discipline,
      name: name.trim(),
      color: color.trim(),
      description: description?.trim() || null,
      orderIndex: nextOrder,
    }).returning();

    const reqs = await db
      .select()
      .from(beltRequirementsTable)
      .where(eq(beltRequirementsTable.beltId, belt.id))
      .orderBy(asc(beltRequirementsTable.orderIndex));

    res.json({ belt: { ...belt, requirements: reqs } });
  } catch (error) {
    console.error("Admin create belt error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.put("/admin/belts/definitions/reorder", requireAdmin, async (req, res) => {
  try {
    const { discipline, order } = req.body as {
      discipline: string;
      order: { id: number; orderIndex: number }[];
    };

    if (!discipline || !order || !Array.isArray(order)) {
      res.status(400).json({ error: "discipline y order son requeridos" });
      return;
    }

    await db.transaction(async (tx) => {
      for (const item of order) {
        await tx
          .update(beltDefinitionsTable)
          .set({ orderIndex: -(item.orderIndex + 1) })
          .where(and(
            eq(beltDefinitionsTable.id, item.id),
            eq(beltDefinitionsTable.discipline, discipline as "ninjutsu" | "jiujitsu"),
          ));
      }
      for (const item of order) {
        await tx
          .update(beltDefinitionsTable)
          .set({ orderIndex: item.orderIndex })
          .where(and(
            eq(beltDefinitionsTable.id, item.id),
            eq(beltDefinitionsTable.discipline, discipline as "ninjutsu" | "jiujitsu"),
          ));
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Admin reorder belts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.put("/admin/belts/definitions/:id", requireAdmin, async (req, res) => {
  try {
    const beltId = parseInt(req.params.id as string, 10);
    if (isNaN(beltId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { name, color, description } = req.body as {
      name?: string;
      color?: string;
      description?: string | null;
    };

    const updateData: Partial<{ name: string; color: string; description: string | null }> = {};
    if (name?.trim()) updateData.name = name.trim();
    if (color?.trim()) updateData.color = color.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "Sin campos para actualizar" });
      return;
    }

    const [belt] = await db
      .update(beltDefinitionsTable)
      .set(updateData)
      .where(eq(beltDefinitionsTable.id, beltId))
      .returning();

    if (!belt) {
      res.status(404).json({ error: "Cinturón no encontrado" });
      return;
    }

    const reqs = await db
      .select()
      .from(beltRequirementsTable)
      .where(eq(beltRequirementsTable.beltId, beltId))
      .orderBy(asc(beltRequirementsTable.orderIndex));

    res.json({ belt: { ...belt, requirements: reqs } });
  } catch (error) {
    console.error("Admin update belt error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.delete("/admin/belts/definitions/:id", requireAdmin, async (req, res) => {
  try {
    const beltId = parseInt(req.params.id as string, 10);
    if (isNaN(beltId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [studentWithBelt] = await db
      .select({ id: studentBeltsTable.id })
      .from(studentBeltsTable)
      .where(eq(studentBeltsTable.currentBeltId, beltId))
      .limit(1);

    if (studentWithBelt) {
      res.status(409).json({ error: "No se puede eliminar: hay alumnos con este cinturón activo" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(beltRequirementsTable).where(eq(beltRequirementsTable.beltId, beltId));
      await tx.delete(beltExamsTable).where(eq(beltExamsTable.beltId, beltId));
      await tx.delete(beltDefinitionsTable).where(eq(beltDefinitionsTable.id, beltId));
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete belt error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/admin/belts/definitions/:id/requirements", requireAdmin, async (req, res) => {
  try {
    const beltId = parseInt(req.params.id as string, 10);
    if (isNaN(beltId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, description } = req.body as { title: string; description?: string };
    if (!title?.trim()) {
      res.status(400).json({ error: "title es requerido" });
      return;
    }

    const [belt] = await db
      .select({ id: beltDefinitionsTable.id })
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.id, beltId))
      .limit(1);

    if (!belt) {
      res.status(404).json({ error: "Cinturón no encontrado" });
      return;
    }

    const existingReqs = await db
      .select({ orderIndex: beltRequirementsTable.orderIndex })
      .from(beltRequirementsTable)
      .where(eq(beltRequirementsTable.beltId, beltId))
      .orderBy(desc(beltRequirementsTable.orderIndex))
      .limit(1);

    const nextOrder = existingReqs.length > 0 ? existingReqs[0].orderIndex + 1 : 1;

    const [requirement] = await db.insert(beltRequirementsTable).values({
      beltId,
      title: title.trim(),
      description: description?.trim() || null,
      orderIndex: nextOrder,
    }).returning();

    res.json({ requirement });
  } catch (error) {
    console.error("Admin create requirement error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.put("/admin/belts/definitions/:id/requirements/:reqId", requireAdmin, async (req, res) => {
  try {
    const beltId = parseInt(req.params.id as string, 10);
    const reqId = parseInt(req.params.reqId as string, 10);
    if (isNaN(beltId) || isNaN(reqId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, description } = req.body as { title?: string; description?: string | null };
    const updateData: Partial<{ title: string; description: string | null }> = {};
    if (title?.trim()) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "Sin campos para actualizar" });
      return;
    }

    const [requirement] = await db
      .update(beltRequirementsTable)
      .set(updateData)
      .where(and(eq(beltRequirementsTable.id, reqId), eq(beltRequirementsTable.beltId, beltId)))
      .returning();

    if (!requirement) {
      res.status(404).json({ error: "Requerimiento no encontrado" });
      return;
    }

    res.json({ requirement });
  } catch (error) {
    console.error("Admin update requirement error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.get("/admin/belts/applications/pending", requireAdmin, async (_req, res) => {
  try {
    const apps = await db
      .select({
        id: beltApplicationsTable.id,
        userId: beltApplicationsTable.userId,
        userDisplayName: usersTable.displayName,
        userEmail: usersTable.email,
        userAvatarUrl: usersTable.avatarUrl,
        discipline: beltApplicationsTable.discipline,
        targetBeltId: beltApplicationsTable.targetBeltId,
        targetBeltName: beltDefinitionsTable.name,
        targetBeltColor: beltDefinitionsTable.color,
        appliedAt: beltApplicationsTable.appliedAt,
      })
      .from(beltApplicationsTable)
      .innerJoin(usersTable, eq(beltApplicationsTable.userId, usersTable.id))
      .innerJoin(beltDefinitionsTable, eq(beltApplicationsTable.targetBeltId, beltDefinitionsTable.id))
      .where(eq(beltApplicationsTable.status, "pending"))
      .orderBy(asc(beltApplicationsTable.appliedAt));
    res.json({ applications: apps });
  } catch (error) {
    console.error("Pending belt applications error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.put("/admin/belts/applications/:id", requireAdmin, async (req, res) => {
  try {
    const appId = parseInt(req.params.id as string, 10);
    if (isNaN(appId)) { res.status(400).json({ error: "ID inválido" }); return; }
    const { action } = req.body as { action: "approve" | "reject" };
    if (action !== "approve" && action !== "reject") {
      res.status(400).json({ error: "Acción inválida" }); return;
    }

    const [app] = await db
      .select()
      .from(beltApplicationsTable)
      .where(eq(beltApplicationsTable.id, appId))
      .limit(1);

    if (!app) { res.status(404).json({ error: "Postulación no encontrada" }); return; }
    if (app.status !== "pending") { res.status(400).json({ error: "Esta postulación ya fue procesada" }); return; }

    const adminId = req.session.userId!;

    if (action === "approve") {
      await db.transaction(async (tx) => {
        await tx.update(beltApplicationsTable)
          .set({ status: "approved", updatedAt: new Date() })
          .where(eq(beltApplicationsTable.id, appId));

        const [targetBelt] = await tx
          .select()
          .from(beltDefinitionsTable)
          .where(eq(beltDefinitionsTable.id, app.targetBeltId))
          .limit(1);

        const [studentBelt] = await tx
          .select()
          .from(studentBeltsTable)
          .where(and(eq(studentBeltsTable.userId, app.userId), eq(studentBeltsTable.discipline, app.discipline)))
          .limit(1);

        if (studentBelt) {
          await tx.update(studentBeltsTable)
            .set({ currentBeltId: app.targetBeltId, nextUnlocked: false, updatedAt: new Date() })
            .where(eq(studentBeltsTable.id, studentBelt.id));
        } else {
          await tx.insert(studentBeltsTable).values({
            userId: app.userId,
            discipline: app.discipline,
            currentBeltId: app.targetBeltId,
            nextUnlocked: false,
          });
        }

        await tx.insert(beltHistoryTable).values({
          userId: app.userId,
          discipline: app.discipline,
          beltId: app.targetBeltId,
          promotedBy: adminId,
          notes: `Postulación aprobada — ${targetBelt?.name || ""}`,
        });
      });
    } else {
      await db.update(beltApplicationsTable)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(beltApplicationsTable.id, appId));
    }

    res.json({ success: true, action });
  } catch (error) {
    console.error("Belt application action error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.post("/admin/belts/assign", requireAdmin, async (req, res) => {
  try {
    const { userId, discipline, beltDefinitionId, notes } = req.body as {
      userId: number;
      discipline: string;
      beltDefinitionId: number;
      notes?: string;
    };
    if (!userId || !discipline || !beltDefinitionId) {
      res.status(400).json({ error: "Faltan datos requeridos" }); return;
    }
    const adminId = req.session.userId!;
    const [targetBelt] = await db
      .select()
      .from(beltDefinitionsTable)
      .where(eq(beltDefinitionsTable.id, beltDefinitionId))
      .limit(1);
    if (!targetBelt) { res.status(404).json({ error: "Cinturón no encontrado" }); return; }

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(studentBeltsTable)
        .where(and(eq(studentBeltsTable.userId, userId), eq(studentBeltsTable.discipline, discipline)))
        .limit(1);
      if (existing) {
        await tx.update(studentBeltsTable)
          .set({ currentBeltId: beltDefinitionId, nextUnlocked: false, updatedAt: new Date() })
          .where(eq(studentBeltsTable.id, existing.id));
      } else {
        await tx.insert(studentBeltsTable).values({
          userId,
          discipline,
          currentBeltId: beltDefinitionId,
          nextUnlocked: false,
        });
      }
      await tx.insert(beltHistoryTable).values({
        userId,
        discipline,
        beltId: beltDefinitionId,
        promotedBy: adminId,
        notes: notes?.trim() || "Asignado por administrador",
      });
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Belt assign error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

beltsRouter.delete("/admin/belts/definitions/:id/requirements/:reqId", requireAdmin, async (req, res) => {
  try {
    const beltId = parseInt(req.params.id as string, 10);
    const reqId = parseInt(req.params.reqId as string, 10);
    if (isNaN(beltId) || isNaN(reqId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db
      .delete(beltRequirementsTable)
      .where(and(eq(beltRequirementsTable.id, reqId), eq(beltRequirementsTable.beltId, beltId)));

    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete requirement error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default beltsRouter;
