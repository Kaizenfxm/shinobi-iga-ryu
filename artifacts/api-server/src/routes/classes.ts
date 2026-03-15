import { Router } from "express";
import crypto from "crypto";
import { db, classesTable, classTrainingSystemsTable, classAttendancesTable, trainingSystemsTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, and, or, desc, sql, inArray, gte, aliasedTable } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const professorUsers = aliasedTable(usersTable, "professor_users");

const classesRouter = Router();

const QR_VALIDITY_HOURS = 3;

function generateQrToken(): string {
  return crypto.randomUUID();
}

async function isAdminOrProfesor(userId: number): Promise<boolean> {
  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(and(
      eq(userRolesTable.userId, userId),
      or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
    ));
  return roles.length > 0;
}

async function isAdmin(userId: number): Promise<boolean> {
  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(and(eq(userRolesTable.userId, userId), eq(userRolesTable.role, "admin")));
  return roles.length > 0;
}

async function isAlumno(userId: number): Promise<boolean> {
  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(and(eq(userRolesTable.userId, userId), eq(userRolesTable.role, "alumno")));
  return roles.length > 0;
}

classesRouter.post("/classes", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const privileged = await isAdminOrProfesor(userId);
    if (!privileged) {
      res.status(403).json({ error: "Solo admin o profesor pueden crear clases" });
      return;
    }

    const { trainingSystemIds, notes, professorId } = req.body;

    if (!Array.isArray(trainingSystemIds) || trainingSystemIds.length === 0) {
      res.status(400).json({ error: "Se requiere al menos un sistema de entrenamiento" });
      return;
    }

    const validSystems = await db
      .select({ id: trainingSystemsTable.id })
      .from(trainingSystemsTable)
      .where(inArray(trainingSystemsTable.id, trainingSystemIds));

    if (validSystems.length !== trainingSystemIds.length) {
      res.status(400).json({ error: "Uno o más sistemas de entrenamiento no existen" });
      return;
    }

    const resolvedProfessorId = typeof professorId === "number" ? professorId : userId;

    const qrToken = generateQrToken();
    const expiresAt = new Date(Date.now() + QR_VALIDITY_HOURS * 60 * 60 * 1000);

    const result = await db.transaction(async (tx) => {
      const [newClass] = await tx
        .insert(classesTable)
        .values({
          createdByUserId: userId,
          professorUserId: resolvedProfessorId,
          notes: notes?.trim() || null,
          qrToken,
          expiresAt,
        })
        .returning();

      for (const systemId of trainingSystemIds) {
        await tx.insert(classTrainingSystemsTable).values({
          classId: newClass.id,
          trainingSystemId: systemId,
        });
      }

      return newClass;
    });

    const systems = await db
      .select({
        systemId: trainingSystemsTable.id,
        systemKey: trainingSystemsTable.key,
        systemName: trainingSystemsTable.name,
      })
      .from(classTrainingSystemsTable)
      .innerJoin(trainingSystemsTable, eq(classTrainingSystemsTable.trainingSystemId, trainingSystemsTable.id))
      .where(eq(classTrainingSystemsTable.classId, result.id));

    res.status(201).json({
      class: {
        id: result.id,
        createdByUserId: result.createdByUserId,
        notes: result.notes,
        qrToken: result.qrToken,
        expiresAt: result.expiresAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
        trainingSystems: systems.map((s) => ({ id: s.systemId, key: s.systemKey, name: s.systemName })),
        attendanceCount: 0,
        createdByName: null,
      },
    });
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.get("/classes", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const userIsAdmin = await isAdmin(userId);
    const isPrivileged = userIsAdmin || await isAdminOrProfesor(userId);

    if (!isPrivileged) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    let query = db
      .select({
        id: classesTable.id,
        createdByUserId: classesTable.createdByUserId,
        professorUserId: classesTable.professorUserId,
        notes: classesTable.notes,
        qrToken: classesTable.qrToken,
        expiresAt: classesTable.expiresAt,
        createdAt: classesTable.createdAt,
        professorName: professorUsers.displayName,
      })
      .from(classesTable)
      .leftJoin(professorUsers, eq(classesTable.professorUserId, professorUsers.id))
      .orderBy(desc(classesTable.createdAt));

    const rows = userIsAdmin
      ? await query
      : await query.where(eq(classesTable.createdByUserId, userId));

    const classIds = rows.map((r) => r.id);
    let systemsByClass = new Map<number, { id: number; key: string; name: string }[]>();
    let attendanceCounts = new Map<number, number>();

    if (classIds.length > 0) {
      const systems = await db
        .select({
          classId: classTrainingSystemsTable.classId,
          systemId: trainingSystemsTable.id,
          systemKey: trainingSystemsTable.key,
          systemName: trainingSystemsTable.name,
        })
        .from(classTrainingSystemsTable)
        .innerJoin(trainingSystemsTable, eq(classTrainingSystemsTable.trainingSystemId, trainingSystemsTable.id))
        .where(inArray(classTrainingSystemsTable.classId, classIds));

      for (const s of systems) {
        const existing = systemsByClass.get(s.classId) || [];
        existing.push({ id: s.systemId, key: s.systemKey, name: s.systemName });
        systemsByClass.set(s.classId, existing);
      }

      const counts = await db
        .select({
          classId: classAttendancesTable.classId,
          count: sql<number>`count(*)::int`,
        })
        .from(classAttendancesTable)
        .where(inArray(classAttendancesTable.classId, classIds))
        .groupBy(classAttendancesTable.classId);

      for (const c of counts) {
        attendanceCounts.set(c.classId, c.count);
      }
    }

    const classes = rows.map((r) => ({
      id: r.id,
      createdByUserId: r.createdByUserId,
      professorUserId: r.professorUserId,
      professorName: r.professorName || null,
      notes: r.notes,
      qrToken: isPrivileged ? r.qrToken : null,
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      trainingSystems: systemsByClass.get(r.id) || [],
      attendanceCount: attendanceCounts.get(r.id) || 0,
    }));

    res.json({ classes });
  } catch (error) {
    console.error("Get classes error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.delete("/classes/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const [existing] = await db
      .select({ id: classesTable.id, createdByUserId: classesTable.createdByUserId })
      .from(classesTable)
      .where(eq(classesTable.id, classId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    const userIsAdmin = await isAdmin(userId);
    if (existing.createdByUserId !== userId && !userIsAdmin) {
      res.status(403).json({ error: "Solo el creador o un admin pueden eliminar esta clase" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(classAttendancesTable).where(eq(classAttendancesTable.classId, classId));
      await tx.delete(classTrainingSystemsTable).where(eq(classTrainingSystemsTable.classId, classId));
      await tx.delete(classesTable).where(eq(classesTable.id, classId));
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.put("/classes/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const privileged = await isAdminOrProfesor(userId);
    if (!privileged) {
      res.status(403).json({ error: "Solo admin o profesor pueden editar clases" });
      return;
    }

    const [existing] = await db
      .select({ id: classesTable.id, createdByUserId: classesTable.createdByUserId })
      .from(classesTable)
      .where(eq(classesTable.id, classId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    const userIsAdmin = await isAdmin(userId);
    if (existing.createdByUserId !== userId && !userIsAdmin) {
      res.status(403).json({ error: "Solo el creador o un admin pueden editar esta clase" });
      return;
    }

    const { trainingSystemIds, notes, professorId } = req.body;

    await db.transaction(async (tx) => {
      const updates: Partial<typeof classesTable.$inferInsert> = {};
      if (notes !== undefined) updates.notes = notes?.trim() || null;
      if (professorId !== undefined) updates.professorUserId = professorId || null;

      if (Object.keys(updates).length > 0) {
        await tx.update(classesTable).set(updates).where(eq(classesTable.id, classId));
      }

      if (Array.isArray(trainingSystemIds) && trainingSystemIds.length > 0) {
        await tx.delete(classTrainingSystemsTable).where(eq(classTrainingSystemsTable.classId, classId));
        for (const systemId of trainingSystemIds) {
          await tx.insert(classTrainingSystemsTable).values({ classId, trainingSystemId: systemId });
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.post("/classes/scan", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { qrToken } = req.body;

    if (!qrToken || typeof qrToken !== "string") {
      res.status(400).json({ error: "Token QR inválido" });
      return;
    }

    const [classRow] = await db
      .select({
        id: classesTable.id,
        notes: classesTable.notes,
        expiresAt: classesTable.expiresAt,
        createdByUserId: classesTable.createdByUserId,
        professorName: professorUsers.displayName,
      })
      .from(classesTable)
      .leftJoin(professorUsers, eq(classesTable.professorUserId, professorUsers.id))
      .where(eq(classesTable.qrToken, qrToken))
      .limit(1);

    if (!classRow) {
      res.status(404).json({ error: "Código QR no válido o clase no encontrada" });
      return;
    }

    if (new Date() > classRow.expiresAt) {
      res.status(400).json({ error: "Este código QR ha expirado" });
      return;
    }

    const existingAttendance = await db
      .select({ id: classAttendancesTable.id })
      .from(classAttendancesTable)
      .where(and(
        eq(classAttendancesTable.classId, classRow.id),
        eq(classAttendancesTable.userId, userId)
      ))
      .limit(1);

    if (existingAttendance.length > 0) {
      res.status(409).json({ error: "Ya registraste asistencia a esta clase" });
      return;
    }

    const [attendance] = await db
      .insert(classAttendancesTable)
      .values({
        classId: classRow.id,
        userId,
      })
      .returning();

    const systems = await db
      .select({ name: trainingSystemsTable.name })
      .from(classTrainingSystemsTable)
      .innerJoin(trainingSystemsTable, eq(classTrainingSystemsTable.trainingSystemId, trainingSystemsTable.id))
      .where(eq(classTrainingSystemsTable.classId, classRow.id));

    const systemNames = systems.map((s) => s.name).join(", ");

    res.json({
      success: true,
      classId: classRow.id,
      className: systemNames || "Clase",
      attendedAt: attendance.attendedAt.toISOString(),
      createdByName: classRow.professorName || null,
    });
  } catch (error) {
    console.error("Scan/checkin error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.patch("/classes/:id/rating", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const { rating } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(400).json({ error: "Rating debe ser entre 1 y 5" });
      return;
    }

    const [updated] = await db
      .update(classAttendancesTable)
      .set({ rating })
      .where(and(
        eq(classAttendancesTable.classId, classId),
        eq(classAttendancesTable.userId, userId)
      ))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "No tienes asistencia registrada en esta clase" });
      return;
    }

    res.json({ success: true, rating: updated.rating });
  } catch (error) {
    console.error("Rate class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.get("/classes/my-attendance", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(eq(classAttendancesTable.userId, userId));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [monthResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(and(
        eq(classAttendancesTable.userId, userId),
        gte(classAttendancesTable.attendedAt, monthStart)
      ));

    const [yearResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(and(
        eq(classAttendancesTable.userId, userId),
        gte(classAttendancesTable.attendedAt, yearStart)
      ));

    const attendances = await db
      .select({
        id: classAttendancesTable.id,
        classId: classAttendancesTable.classId,
        attendedAt: classAttendancesTable.attendedAt,
        rating: classAttendancesTable.rating,
        notes: classesTable.notes,
        professorName: professorUsers.displayName,
      })
      .from(classAttendancesTable)
      .innerJoin(classesTable, eq(classAttendancesTable.classId, classesTable.id))
      .leftJoin(professorUsers, eq(classesTable.professorUserId, professorUsers.id))
      .where(eq(classAttendancesTable.userId, userId))
      .orderBy(desc(classAttendancesTable.attendedAt));

    const classIds = attendances.map((a) => a.classId);
    let systemsByClass = new Map<number, string[]>();

    if (classIds.length > 0) {
      const systems = await db
        .select({
          classId: classTrainingSystemsTable.classId,
          systemName: trainingSystemsTable.name,
        })
        .from(classTrainingSystemsTable)
        .innerJoin(trainingSystemsTable, eq(classTrainingSystemsTable.trainingSystemId, trainingSystemsTable.id))
        .where(inArray(classTrainingSystemsTable.classId, classIds));

      for (const s of systems) {
        const existing = systemsByClass.get(s.classId) || [];
        existing.push(s.systemName);
        systemsByClass.set(s.classId, existing);
      }
    }

    res.json({
      totalClasses: totalResult.count,
      monthClasses: monthResult.count,
      yearClasses: yearResult.count,
      attendances: attendances.map((a) => ({
        id: a.id,
        classId: a.classId,
        attendedAt: a.attendedAt.toISOString(),
        rating: a.rating,
        notes: a.notes || null,
        systemNames: systemsByClass.get(a.classId) || [],
        createdByName: a.professorName || null,
      })),
    });
  } catch (error) {
    console.error("My attendance error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.get("/classes/:id/attendees", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      res.status(403).json({ error: "Solo admin puede ver los asistentes" });
      return;
    }

    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const attendees = await db
      .select({
        id: classAttendancesTable.id,
        userId: classAttendancesTable.userId,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        attendedAt: classAttendancesTable.attendedAt,
        rating: classAttendancesTable.rating,
      })
      .from(classAttendancesTable)
      .innerJoin(usersTable, eq(classAttendancesTable.userId, usersTable.id))
      .where(eq(classAttendancesTable.classId, classId))
      .orderBy(classAttendancesTable.attendedAt);

    res.json({
      attendees: attendees.map((a) => ({
        ...a,
        attendedAt: a.attendedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get attendees error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.get("/classes/professors", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const privileged = await isAdminOrProfesor(userId);
    if (!privileged) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const professors = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        email: usersTable.email,
      })
      .from(usersTable)
      .innerJoin(userRolesTable, and(
        eq(userRolesTable.userId, usersTable.id),
        or(eq(userRolesTable.role, "profesor"), eq(userRolesTable.role, "admin"))
      ))
      .orderBy(usersTable.displayName);

    const uniqueProfessors = Array.from(
      new Map(professors.map((p) => [p.id, p])).values()
    );

    res.json({ professors: uniqueProfessors });
  } catch (error) {
    console.error("Get professors error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default classesRouter;
