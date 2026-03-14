import { Router } from "express";
import {
  db,
  usersTable,
  userRolesTable,
  studentBeltsTable,
  beltDefinitionsTable,
  fightsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

const profileRouter = Router();

profileRouter.get("/profile/me", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        phone: usersTable.phone,
        isFighter: usersTable.isFighter,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, userId));

    const belts = await db
      .select({
        discipline: studentBeltsTable.discipline,
        beltName: beltDefinitionsTable.name,
        beltColor: beltDefinitionsTable.color,
        beltOrder: beltDefinitionsTable.orderIndex,
      })
      .from(studentBeltsTable)
      .innerJoin(beltDefinitionsTable, eq(studentBeltsTable.currentBeltId, beltDefinitionsTable.id))
      .where(eq(studentBeltsTable.userId, userId))
      .orderBy(asc(studentBeltsTable.discipline));

    let fightStats = null;
    if (user.isFighter) {
      const fights = await db
        .select({ result: fightsTable.result })
        .from(fightsTable)
        .where(eq(fightsTable.userId, userId));

      const total = fights.length;
      const victorias = fights.filter((f) => f.result === "victoria").length;
      const derrotas = fights.filter((f) => f.result === "derrota").length;
      const empates = fights.filter((f) => f.result === "empate").length;

      fightStats = {
        total,
        victorias,
        derrotas,
        empates,
        winPercentage: total > 0 ? Math.round((victorias / total) * 100) : 0,
      };
    }

    res.json({
      profile: {
        ...user,
        roles: roles.map((r) => r.role),
        belts,
        fightStats,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

profileRouter.put("/profile/me", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { displayName, phone } = req.body;

    if (displayName !== undefined && typeof displayName !== "string") {
      res.status(400).json({ error: "Nombre inválido" });
      return;
    }
    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      res.status(400).json({ error: "Teléfono inválido" });
      return;
    }

    const trimmedName = displayName?.trim();
    if (trimmedName !== undefined && trimmedName.length === 0) {
      res.status(400).json({ error: "El nombre no puede estar vacío" });
      return;
    }

    const updates: { displayName?: string; phone?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (trimmedName !== undefined) updates.displayName = trimmedName;
    if (phone !== undefined) updates.phone = phone?.trim() || null;

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        phone: usersTable.phone,
        isFighter: usersTable.isFighter,
      });

    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ user: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

profileRouter.post("/profile/me/avatar/url", requireAuth, async (req, res) => {
  try {
    const { contentType } = req.body;
    if (!contentType || typeof contentType !== "string" || !contentType.startsWith("image/")) {
      res.status(400).json({ error: "contentType de imagen requerido" });
      return;
    }
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    console.error("Avatar URL error:", error);
    res.status(500).json({ error: "Error generando URL de subida" });
  }
});

profileRouter.put("/profile/me/avatar", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { objectPath } = req.body;
    if (!objectPath || typeof objectPath !== "string") {
      res.status(400).json({ error: "objectPath requerido" });
      return;
    }
    const [updated] = await db
      .update(usersTable)
      .set({ avatarUrl: objectPath, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        phone: usersTable.phone,
        isFighter: usersTable.isFighter,
      });
    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }
    res.json({ user: updated });
  } catch (error) {
    console.error("Save avatar error:", error);
    res.status(500).json({ error: "Error guardando avatar" });
  }
});

export default profileRouter;
