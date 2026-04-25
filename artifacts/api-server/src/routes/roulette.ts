import { Router, raw } from "express";
import { db, roulettePunishmentsTable, userRolesTable } from "@workspace/db";
import { eq, and, or, asc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();
const rouletteRouter = Router();

const MAX_PUNISHMENTS = 20;

async function isAdminOrProfesor(userId: number): Promise<boolean> {
  const roles = await db
    .select({ role: userRolesTable.role })
    .from(userRolesTable)
    .where(
      and(
        eq(userRolesTable.userId, userId),
        or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
      )
    );
  return roles.length > 0;
}

rouletteRouter.get("/roulette/punishments", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await isAdminOrProfesor(userId))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const rows = await db
      .select()
      .from(roulettePunishmentsTable)
      .orderBy(asc(roulettePunishmentsTable.sortOrder), asc(roulettePunishmentsTable.id));

    res.json({
      punishments: rows.map((r) => ({
        id: r.id,
        label: r.label,
        iconUrl: r.iconUrl,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      })),
    });
  } catch (error) {
    console.error("List roulette punishments error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

rouletteRouter.post("/roulette/punishments", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await isAdminOrProfesor(userId))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const { label, iconUrl } = req.body as { label?: string; iconUrl?: string | null };
    const trimmed = (label || "").trim();
    if (!trimmed) {
      res.status(400).json({ error: "El texto es requerido" });
      return;
    }
    if (trimmed.length > 100) {
      res.status(400).json({ error: "El texto no puede superar 100 caracteres" });
      return;
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(roulettePunishmentsTable);
    if (count >= MAX_PUNISHMENTS) {
      res.status(400).json({ error: `Máximo ${MAX_PUNISHMENTS} castigos` });
      return;
    }

    const [created] = await db
      .insert(roulettePunishmentsTable)
      .values({
        label: trimmed,
        iconUrl: iconUrl || null,
        sortOrder: count,
      })
      .returning();

    res.status(201).json({ punishment: created });
  } catch (error) {
    console.error("Create roulette punishment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

rouletteRouter.put("/roulette/punishments/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await isAdminOrProfesor(userId))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { label, iconUrl, isActive } = req.body as {
      label?: string;
      iconUrl?: string | null;
      isActive?: boolean;
    };

    const updates: Partial<typeof roulettePunishmentsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (label !== undefined) {
      const trimmed = label.trim();
      if (!trimmed) {
        res.status(400).json({ error: "El texto no puede estar vacío" });
        return;
      }
      if (trimmed.length > 100) {
        res.status(400).json({ error: "El texto no puede superar 100 caracteres" });
        return;
      }
      updates.label = trimmed;
    }
    if (iconUrl !== undefined) updates.iconUrl = iconUrl;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(roulettePunishmentsTable)
      .set(updates)
      .where(eq(roulettePunishmentsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Castigo no encontrado" });
      return;
    }

    res.json({ punishment: updated });
  } catch (error) {
    console.error("Update roulette punishment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

rouletteRouter.delete("/roulette/punishments/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await isAdminOrProfesor(userId))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [deleted] = await db
      .delete(roulettePunishmentsTable)
      .where(eq(roulettePunishmentsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Castigo no encontrado" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete roulette punishment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

rouletteRouter.post(
  "/roulette/icon-upload",
  requireAuth,
  raw({ limit: "300kb", type: "image/*" }),
  async (req, res) => {
    try {
      const userId = req.session.userId!;
      if (!(await isAdminOrProfesor(userId))) {
        res.status(403).json({ error: "Acceso no autorizado" });
        return;
      }
      const contentType = (req.headers["content-type"] || "image/png").split(";")[0].trim();
      if (!contentType.startsWith("image/")) {
        res.status(400).json({ error: "Tipo de archivo inválido" });
        return;
      }
      const buf = req.body as Buffer;
      if (!buf || !buf.length) {
        res.status(400).json({ error: "Imagen vacía" });
        return;
      }
      const objectPath = await objectStorageService.uploadBuffer(buf, contentType, 256, 256);
      res.json({ objectPath });
    } catch (error) {
      console.error("Roulette icon upload error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

rouletteRouter.post("/roulette/spin", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!(await isAdminOrProfesor(userId))) {
      res.status(403).json({ error: "Acceso no autorizado" });
      return;
    }

    const active = await db
      .select()
      .from(roulettePunishmentsTable)
      .where(eq(roulettePunishmentsTable.isActive, true))
      .orderBy(asc(roulettePunishmentsTable.sortOrder), asc(roulettePunishmentsTable.id));

    if (active.length === 0) {
      res.status(400).json({ error: "No hay castigos activos" });
      return;
    }

    const winnerIndex = Math.floor(Math.random() * active.length);
    const winner = active[winnerIndex];

    res.json({
      winnerId: winner.id,
      winnerIndex,
      total: active.length,
      label: winner.label,
      iconUrl: winner.iconUrl,
    });
  } catch (error) {
    console.error("Roulette spin error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default rouletteRouter;
