import { Router } from "express";
import { db, trainingSystemsTable, exercisesTable, knowledgeItemsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const trainingRouter = Router();

trainingRouter.get("/training/systems", requireAuth, async (_req, res) => {
  try {
    const systems = await db
      .select()
      .from(trainingSystemsTable)
      .where(eq(trainingSystemsTable.isActive, true))
      .orderBy(asc(trainingSystemsTable.id));
    res.json({ systems });
  } catch (error) {
    console.error("Get training systems error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.get("/training/systems/:key", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key);

    const [system] = await db
      .select()
      .from(trainingSystemsTable)
      .where(eq(trainingSystemsTable.key, key))
      .limit(1);

    if (!system) {
      res.status(404).json({ error: "Sistema no encontrado" });
      return;
    }

    const exercises = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.trainingSystemId, system.id))
      .orderBy(asc(exercisesTable.orderIndex), asc(exercisesTable.id));

    const knowledge = await db
      .select()
      .from(knowledgeItemsTable)
      .where(eq(knowledgeItemsTable.trainingSystemId, system.id))
      .orderBy(asc(knowledgeItemsTable.orderIndex), asc(knowledgeItemsTable.id));

    res.json({ system, exercises, knowledge });
  } catch (error) {
    console.error("Get training system detail error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/exercises", requireAdmin, async (req, res) => {
  try {
    const {
      trainingSystemId,
      title,
      description,
      videoUrl,
      imageUrl,
      durationMinutes,
      level,
      orderIndex,
    } = req.body as {
      trainingSystemId?: number;
      title?: string;
      description?: string;
      videoUrl?: string;
      imageUrl?: string;
      durationMinutes?: number;
      level?: string;
      orderIndex?: number;
    };

    if (!trainingSystemId || !title?.trim()) {
      res.status(400).json({ error: "Sistema y título son requeridos" });
      return;
    }

    const [exercise] = await db
      .insert(exercisesTable)
      .values({
        trainingSystemId,
        title: title.trim(),
        description: description?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        durationMinutes: durationMinutes ?? null,
        level: level?.trim() || null,
        orderIndex: orderIndex ?? 0,
        createdByUserId: req.session.userId!,
      })
      .returning();

    res.json({ exercise });
  } catch (error) {
    console.error("Create exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/exercises/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, description, videoUrl, imageUrl, durationMinutes, level, orderIndex, isActive } = req.body;

    const updates: Partial<typeof exercisesTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (level !== undefined) updates.level = level?.trim() || null;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(exercisesTable)
      .set(updates)
      .where(eq(exercisesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Ejercicio no encontrado" });
      return;
    }

    res.json({ exercise: updated });
  } catch (error) {
    console.error("Update exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/exercises/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/knowledge", requireAdmin, async (req, res) => {
  try {
    const {
      trainingSystemId,
      title,
      content,
      videoUrl,
      imageUrl,
      orderIndex,
    } = req.body as {
      trainingSystemId?: number;
      title?: string;
      content?: string;
      videoUrl?: string;
      imageUrl?: string;
      orderIndex?: number;
    };

    if (!trainingSystemId || !title?.trim()) {
      res.status(400).json({ error: "Sistema y título son requeridos" });
      return;
    }

    const [item] = await db
      .insert(knowledgeItemsTable)
      .values({
        trainingSystemId,
        title: title.trim(),
        content: content?.trim() || null,
        videoUrl: videoUrl?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        orderIndex: orderIndex ?? 0,
        createdByUserId: req.session.userId!,
      })
      .returning();

    res.json({ item });
  } catch (error) {
    console.error("Create knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/knowledge/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, content, videoUrl, imageUrl, orderIndex, isActive } = req.body;

    const updates: Partial<typeof knowledgeItemsTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (content !== undefined) updates.content = content?.trim() || null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(knowledgeItemsTable)
      .set(updates)
      .where(eq(knowledgeItemsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Item no encontrado" });
      return;
    }

    res.json({ item: updated });
  } catch (error) {
    console.error("Update knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/knowledge/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db.delete(knowledgeItemsTable).where(eq(knowledgeItemsTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default trainingRouter;
