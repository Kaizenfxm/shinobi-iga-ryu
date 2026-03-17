import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventAttendeesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();
const eventsRouter = Router();

async function hasRole(userId: number, role: string): Promise<boolean> {
  const rows = await db.execute(
    sql`SELECT 1 FROM user_roles WHERE user_id = ${userId} AND role = ${role} LIMIT 1`
  );
  return (rows as unknown as unknown[]).length > 0;
}

async function canManageEvents(userId: number): Promise<boolean> {
  return (await hasRole(userId, "admin")) || (await hasRole(userId, "profesor"));
}

eventsRouter.post("/events/cover-upload-url", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await canManageEvents(userId))) {
      res.status(403).json({ error: "Sin permisos" });
      return;
    }
    const { contentType } = req.body;
    if (!contentType || typeof contentType !== "string" || !contentType.startsWith("image/")) {
      res.status(400).json({ error: "contentType de imagen requerido" });
      return;
    }
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    console.error("Event cover upload URL error:", error);
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
    const { title, coverImageUrl, eventDate, location } = req.body;
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
        location: location.trim(),
        createdByUserId: userId,
      })
      .returning();
    res.json({
      event: {
        ...event,
        eventDate: event.eventDate.toISOString(),
        attendeeCount: 0,
        userWillAttend: null,
      },
    });
  } catch (error) {
    console.error("Create event error:", error);
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
