import { Router, raw } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventAttendeesTable, usersTable, userRolesTable } from "@workspace/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { ObjectStorageService } from "../lib/objectStorage";
import { notifyTarget, notifyUsers } from "../lib/push";

const objectStorageService = new ObjectStorageService();
const eventsRouter = Router();

async function canManageEvents(userId: number): Promise<boolean> {
  const rows = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(
      and(
        eq(userRolesTable.userId, userId),
        sql`${userRolesTable.role} IN ('admin', 'profesor')`
      )
    )
    .limit(1);
  return rows.length > 0;
}

eventsRouter.post("/events/cover-upload", requireAuth, raw({ limit: "15mb", type: "image/*" }), async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await canManageEvents(userId))) {
      res.status(403).json({ error: "Sin permisos" });
      return;
    }
    const contentType = (req.headers["content-type"] || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "Tipo de archivo inválido" });
      return;
    }
    const objectPath = await objectStorageService.uploadBuffer(req.body as Buffer, contentType, 1200, 800);
    res.json({ objectPath });
  } catch (error) {
    console.error("Event cover upload error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.get("/events", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const events = await db
      .select()
      .from(eventsTable)
      .orderBy(desc(eventsTable.eventDate));

    if (events.length === 0) {
      res.json({ events: [] });
      return;
    }

    const eventIds = events.map((e) => e.id);

    const countRows = await db
      .select({
        eventId: eventAttendeesTable.eventId,
        count: sql<number>`count(*)::int`,
      })
      .from(eventAttendeesTable)
      .where(and(
        inArray(eventAttendeesTable.eventId, eventIds),
        eq(eventAttendeesTable.willAttend, true)
      ))
      .groupBy(eventAttendeesTable.eventId);

    const attendeeCounts = new Map(countRows.map((r) => [r.eventId, r.count]));

    const userRows = await db
      .select({ eventId: eventAttendeesTable.eventId, willAttend: eventAttendeesTable.willAttend })
      .from(eventAttendeesTable)
      .where(and(
        inArray(eventAttendeesTable.eventId, eventIds),
        eq(eventAttendeesTable.userId, userId)
      ));

    const userAttendance = new Map(userRows.map((r) => [r.eventId, r.willAttend]));

    res.json({
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        coverImageUrl: e.coverImageUrl,
        eventDate: e.eventDate.toISOString(),
        eventEndDate: e.eventEndDate ? e.eventEndDate.toISOString() : null,
        videoUrl: e.videoUrl ?? null,
        location: e.location,
        createdByUserId: e.createdByUserId,
        attendeeCount: attendeeCounts.get(e.id) ?? 0,
        userWillAttend: userAttendance.has(e.id) ? userAttendance.get(e.id) : null,
      })),
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.post("/events", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await canManageEvents(userId))) {
      res.status(403).json({ error: "Solo admins y profesores pueden crear eventos" });
      return;
    }
    const { title, coverImageUrl, eventDate, eventEndDate, videoUrl, location } = req.body;
    if (!title?.trim() || !eventDate || !location?.trim()) {
      res.status(400).json({ error: "Título, fecha y lugar son requeridos" });
      return;
    }
    const [event] = await db
      .insert(eventsTable)
      .values({
        title: title.trim(),
        coverImageUrl: coverImageUrl || null,
        eventDate: new Date(eventDate),
        eventEndDate: eventEndDate ? new Date(eventEndDate) : null,
        videoUrl: videoUrl?.trim() || null,
        location: location.trim(),
        createdByUserId: userId,
      })
      .returning();

    // Notify all users about the new event
    const dateStr = new Date(eventDate).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" });
    notifyTarget(["todas"],
      `🥷 Nuevo evento: ${title.trim()}`,
      `${dateStr} · ${location.trim()} — toca para ver los detalles`,
      { type: "new_event", eventId: event.id }
    ).catch(() => {});

    res.json({
      event: {
        ...event,
        eventDate: event.eventDate.toISOString(),
        eventEndDate: event.eventEndDate ? event.eventEndDate.toISOString() : null,
        videoUrl: event.videoUrl ?? null,
        attendeeCount: 0,
        userWillAttend: null,
      },
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.patch("/events/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await canManageEvents(userId))) {
      res.status(403).json({ error: "Sin permisos" });
      return;
    }
    const eventId = parseInt(String(req.params.id), 10);
    if (isNaN(eventId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const { title, coverImageUrl, eventDate, eventEndDate, videoUrl, location } = req.body as {
      title?: string; coverImageUrl?: string | null; eventDate?: string; eventEndDate?: string | null; videoUrl?: string | null; location?: string;
    };

    const updates: Record<string, unknown> = {};
    if (title?.trim()) updates.title = title.trim();
    if (eventDate) updates.eventDate = new Date(eventDate);
    if (eventEndDate !== undefined) updates.eventEndDate = eventEndDate ? new Date(eventEndDate) : null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;
    if (location?.trim()) updates.location = location.trim();
    if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nada que actualizar" }); return;
    }

    const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Evento no encontrado" }); return; }

    const oldCoverImageUrl = existing.coverImageUrl;

    const [updated] = await db.update(eventsTable)
      .set(updates as Partial<typeof eventsTable.$inferInsert>)
      .where(eq(eventsTable.id, eventId))
      .returning();

    if (coverImageUrl !== undefined && coverImageUrl !== oldCoverImageUrl && oldCoverImageUrl) {
      await objectStorageService.deleteObject(oldCoverImageUrl);
    }

    // Notify attendees who confirmed attendance
    const attendeeRows = await db
      .select({ userId: eventAttendeesTable.userId })
      .from(eventAttendeesTable)
      .where(and(
        eq(eventAttendeesTable.eventId, eventId),
        eq(eventAttendeesTable.willAttend, true)
      ));
    const attendeeIds = attendeeRows.map((r) => r.userId).filter((id) => id !== userId);
    if (attendeeIds.length > 0) {
      notifyUsers(
        attendeeIds,
        `🗓 Evento modificado`,
        `El evento ${updated.title} ha sido modificado, toca para revisarlo`,
        { type: "event_updated", eventId }
      ).catch(() => {});
    }

    res.json({
      event: {
        ...updated,
        eventDate: updated.eventDate.toISOString(),
        eventEndDate: updated.eventEndDate ? updated.eventEndDate.toISOString() : null,
        videoUrl: updated.videoUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.delete("/events/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await canManageEvents(userId))) {
      res.status(403).json({ error: "Sin permisos" });
      return;
    }
    const eventId = parseInt(String(req.params.id), 10);
    if (isNaN(eventId)) { res.status(400).json({ error: "ID inválido" }); return; }
    await db.delete(eventsTable).where(eq(eventsTable.id, eventId));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.post("/events/:id/attend", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const eventId = parseInt(String(req.params.id), 10);
    if (isNaN(eventId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const willAttend: boolean = req.body.willAttend !== false;

    await db
      .insert(eventAttendeesTable)
      .values({ eventId, userId, willAttend })
      .onConflictDoUpdate({
        target: [eventAttendeesTable.eventId, eventAttendeesTable.userId],
        set: { willAttend },
      });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(eventAttendeesTable)
      .where(and(
        eq(eventAttendeesTable.eventId, eventId),
        eq(eventAttendeesTable.willAttend, true)
      ));

    res.json({ success: true, willAttend, attendeeCount: count });
  } catch (error) {
    console.error("Attend event error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

eventsRouter.get("/events/:id/attendees", requireAuth, async (req, res) => {
  try {
    const eventId = parseInt(String(req.params.id), 10);
    if (isNaN(eventId)) { res.status(400).json({ error: "ID inválido" }); return; }

    const attendees = await db
      .select({
        id: usersTable.id,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(eventAttendeesTable)
      .innerJoin(usersTable, eq(eventAttendeesTable.userId, usersTable.id))
      .where(and(
        eq(eventAttendeesTable.eventId, eventId),
        eq(eventAttendeesTable.willAttend, true)
      ))
      .orderBy(usersTable.displayName);

    res.json({ attendees });
  } catch (error) {
    console.error("Get attendees error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default eventsRouter;
