import { Router } from "express";
import crypto from "crypto";
import { db, classesTable, classTrainingSystemsTable, classAttendancesTable, trainingSystemsTable, usersTable, userRolesTable } from "@workspace/db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const classesRouter = Router();

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

classesRouter.get("/classes", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const sedeFilter = req.query.sede as string | undefined;
    const isPrivileged = await isAdminOrProfesor(userId);

    let query = db
      .select({
        id: classesTable.id,
        title: classesTable.title,
        description: classesTable.description,
        sede: classesTable.sede,
        classDate: classesTable.classDate,
        startTime: classesTable.startTime,
        endTime: classesTable.endTime,
        profesorId: classesTable.profesorId,
        maxCapacity: classesTable.maxCapacity,
        status: classesTable.status,
        qrToken: classesTable.qrToken,
        createdAt: classesTable.createdAt,
        profesorName: usersTable.displayName,
      })
      .from(classesTable)
      .leftJoin(usersTable, eq(classesTable.profesorId, usersTable.id))
      .orderBy(desc(classesTable.classDate), desc(classesTable.startTime));

    const rows = sedeFilter
      ? await query.where(eq(classesTable.sede, sedeFilter))
      : await query;

    const classIds = rows.map((r) => r.id);
    let systemsByClass = new Map<number, { id: number; key: string; name: string }[]>();
    let attendanceCounts = new Map<number, number>();
    let myAttendances = new Map<number, { checkedInAt: string; rating: number | null }>();

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

      const myAtt = await db
        .select({
          classId: classAttendancesTable.classId,
          checkedInAt: classAttendancesTable.checkedInAt,
          rating: classAttendancesTable.rating,
        })
        .from(classAttendancesTable)
        .where(and(
          inArray(classAttendancesTable.classId, classIds),
          eq(classAttendancesTable.userId, userId)
        ));

      for (const a of myAtt) {
        myAttendances.set(a.classId, {
          checkedInAt: a.checkedInAt.toISOString(),
          rating: a.rating,
        });
      }
    }

    const classes = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      sede: r.sede,
      classDate: r.classDate,
      startTime: r.startTime,
      endTime: r.endTime,
      profesorId: r.profesorId,
      profesorName: r.profesorName || null,
      maxCapacity: r.maxCapacity,
      status: r.status,
      qrToken: isPrivileged ? r.qrToken : null,
      createdAt: r.createdAt.toISOString(),
      trainingSystems: systemsByClass.get(r.id) || [],
      attendanceCount: attendanceCounts.get(r.id) || 0,
      myAttendance: myAttendances.get(r.id) || null,
    }));

    res.json({ classes });
  } catch (error) {
    console.error("Get classes error:", error);
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

classesRouter.post("/classes/checkin", requireAuth, async (req, res) => {
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
        title: classesTable.title,
        status: classesTable.status,
        maxCapacity: classesTable.maxCapacity,
      })
      .from(classesTable)
      .where(eq(classesTable.qrToken, qrToken))
      .limit(1);

    if (!classRow) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    if (classRow.status === "cancelada") {
      res.status(400).json({ error: "Esta clase fue cancelada" });
      return;
    }

    if (classRow.status === "finalizada") {
      res.status(400).json({ error: "Esta clase ya finalizó" });
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
      res.status(409).json({ error: "Ya registraste asistencia a esta clase", className: classRow.title });
      return;
    }

    if (classRow.maxCapacity) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(classAttendancesTable)
        .where(eq(classAttendancesTable.classId, classRow.id));

      if (countResult.count >= classRow.maxCapacity) {
        res.status(400).json({ error: "La clase está llena" });
        return;
      }
    }

    const [attendance] = await db
      .insert(classAttendancesTable)
      .values({
        classId: classRow.id,
        userId,
      })
      .returning();

    res.json({
      success: true,
      className: classRow.title,
      classId: classRow.id,
      checkedInAt: attendance.checkedInAt.toISOString(),
    });
  } catch (error) {
    console.error("Checkin error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.put("/classes/:id/rate", requireAuth, async (req, res) => {
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

classesRouter.get("/classes/my-stats", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(eq(classAttendancesTable.userId, userId));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [monthResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(classAttendancesTable)
      .where(and(
        eq(classAttendancesTable.userId, userId),
        sql`${classAttendancesTable.checkedInAt} >= ${monthStart}`
      ));

    res.json({
      totalClasses: totalResult.count,
      monthClasses: monthResult.count,
    });
  } catch (error) {
    console.error("My stats error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.post("/admin/classes", requireAdmin, async (req, res) => {
  try {
    const { title, description, sede, classDate, startTime, endTime, profesorId, maxCapacity, trainingSystemIds } = req.body;

    if (!title || !sede || !classDate || !startTime) {
      res.status(400).json({ error: "Título, sede, fecha y hora de inicio son obligatorios" });
      return;
    }

    const validSedes = ["bogota", "chia"];
    if (!validSedes.includes(sede)) {
      res.status(400).json({ error: "Sede inválida" });
      return;
    }

    const qrToken = generateQrToken();

    const result = await db.transaction(async (tx) => {
      const [newClass] = await tx
        .insert(classesTable)
        .values({
          title: title.trim(),
          description: description?.trim() || null,
          sede,
          classDate,
          startTime,
          endTime: endTime || null,
          profesorId: profesorId || null,
          maxCapacity: maxCapacity || null,
          qrToken,
        })
        .returning();

      if (Array.isArray(trainingSystemIds) && trainingSystemIds.length > 0) {
        for (const systemId of trainingSystemIds) {
          await tx.insert(classTrainingSystemsTable).values({
            classId: newClass.id,
            trainingSystemId: systemId,
          });
        }
      }

      return newClass;
    });

    res.status(201).json({ class: { ...result, createdAt: result.createdAt.toISOString(), updatedAt: result.updatedAt.toISOString() } });
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.put("/admin/classes/:id", requireAdmin, async (req, res) => {
  try {
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const { title, description, sede, classDate, startTime, endTime, profesorId, maxCapacity, status, trainingSystemIds } = req.body;

    const updates: Partial<typeof classesTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (sede !== undefined) {
      const validSedes = ["bogota", "chia"];
      if (!validSedes.includes(sede)) {
        res.status(400).json({ error: "Sede inválida" });
        return;
      }
      updates.sede = sede;
    }
    if (classDate !== undefined) updates.classDate = classDate;
    if (startTime !== undefined) updates.startTime = startTime;
    if (endTime !== undefined) updates.endTime = endTime || null;
    if (profesorId !== undefined) updates.profesorId = profesorId || null;
    if (maxCapacity !== undefined) updates.maxCapacity = maxCapacity || null;
    if (status !== undefined) {
      const validStatuses = ["programada", "en_curso", "finalizada", "cancelada"] as const;
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: "Estado inválido" });
        return;
      }
      updates.status = status;
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(classesTable)
        .set(updates)
        .where(eq(classesTable.id, classId))
        .returning();

      if (!updated) return null;

      if (Array.isArray(trainingSystemIds)) {
        await tx.delete(classTrainingSystemsTable).where(eq(classTrainingSystemsTable.classId, classId));
        for (const systemId of trainingSystemIds) {
          await tx.insert(classTrainingSystemsTable).values({
            classId,
            trainingSystemId: systemId,
          });
        }
      }

      return updated;
    });

    if (!result) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    res.json({ class: { ...result, createdAt: result.createdAt.toISOString(), updatedAt: result.updatedAt.toISOString() } });
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.delete("/admin/classes/:id", requireAdmin, async (req, res) => {
  try {
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const [existing] = await db
      .select({ id: classesTable.id })
      .from(classesTable)
      .where(eq(classesTable.id, classId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    await db.delete(classesTable).where(eq(classesTable.id, classId));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

classesRouter.post("/admin/classes/:id/regenerate-qr", requireAdmin, async (req, res) => {
  try {
    const classId = parseInt(String(req.params.id), 10);
    if (isNaN(classId)) {
      res.status(400).json({ error: "ID de clase inválido" });
      return;
    }

    const newToken = generateQrToken();
    const [updated] = await db
      .update(classesTable)
      .set({ qrToken: newToken, updatedAt: new Date() })
      .where(eq(classesTable.id, classId))
      .returning({ id: classesTable.id, qrToken: classesTable.qrToken });

    if (!updated) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    res.json({ success: true, qrToken: updated.qrToken });
  } catch (error) {
    console.error("Regenerate QR error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default classesRouter;
