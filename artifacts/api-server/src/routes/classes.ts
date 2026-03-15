import { Router } from "express";
import crypto from "crypto";
import { db, classesTable, classTrainingSystemsTable, classAttendancesTable, trainingSystemsTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, and, or, desc, sql, inArray, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const classesRouter = Router();

const QR_VALIDITY_HOURS = 3;

function generateQrToken(): string {
  return crypto.randomBytes(16).toString("hex");
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

classesRouter.post("/classes", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const privileged = await isAdminOrProfesor(userId);
    if (!privileged) {
      res.status(403).json({ error: "Solo admin o profesor pueden crear clases" });
      return;
    }

    const { trainingSystemIds, notes } = req.body;

    if (!Array.isArray(trainingSystemIds) || trainingSystemIds.length === 0) {
      res.status(400).json({ error: "Se requiere al menos un sistema de entrenamiento" });
      return;
    }

    const qrToken = generateQrToken();
    const expiresAt = new Date(Date.now() + QR_VALIDITY_HOURS * 60 * 60 * 1000);

    const result = await db.transaction(async (tx) => {
      const [newClass] = await tx
        .insert(classesTable)
        .values({
          createdByUserId: userId,
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
    const isPrivileged = await isAdminOrProfesor(userId);

    const rows = await db
      .select({
        id: classesTable.id,
        createdByUserId: classesTable.createdByUserId,
        notes: classesTable.notes,
        qrToken: classesTable.qrToken,
        expiresAt: classesTable.expiresAt,
        createdAt: classesTable.createdAt,
        createdByName: usersTable.displayName,
      })
      .from(classesTable)
      .leftJoin(usersTable, eq(classesTable.createdByUserId, usersTable.id))
      .orderBy(desc(classesTable.createdAt));

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
      createdByName: r.createdByName || null,
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

    await db.delete(classesTable).where(eq(classesTable.id, classId));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
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
      })
      .from(classesTable)
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
      checkedInAt: attendance.checkedInAt.toISOString(),
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
        gte(classAttendancesTable.checkedInAt, monthStart)
      ));

    const [yearResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(and(
        eq(classAttendancesTable.userId, userId),
        gte(classAttendancesTable.checkedInAt, yearStart)
      ));

    const attendances = await db
      .select({
        id: classAttendancesTable.id,
        classId: classAttendancesTable.classId,
        checkedInAt: classAttendancesTable.checkedInAt,
        rating: classAttendancesTable.rating,
      })
      .from(classAttendancesTable)
      .where(eq(classAttendancesTable.userId, userId))
      .orderBy(desc(classAttendancesTable.checkedInAt));

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
        checkedInAt: a.checkedInAt.toISOString(),
        rating: a.rating,
        systemNames: systemsByClass.get(a.classId) || [],
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
    const privileged = await isAdminOrProfesor(userId);
    if (!privileged) {
      res.status(403).json({ error: "Acceso no autorizado" });
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
        checkedInAt: classAttendancesTable.checkedInAt,
        rating: classAttendancesTable.rating,
      })
      .from(classAttendancesTable)
      .innerJoin(usersTable, eq(classAttendancesTable.userId, usersTable.id))
      .where(eq(classAttendancesTable.classId, classId))
      .orderBy(classAttendancesTable.checkedInAt);

    res.json({
      attendees: attendees.map((a) => ({
        ...a,
        checkedInAt: a.checkedInAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get attendees error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default classesRouter;
