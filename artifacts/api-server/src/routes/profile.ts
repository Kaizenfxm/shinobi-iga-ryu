import { Router } from "express";
import {
  db,
  usersTable,
  userRolesTable,
  studentBeltsTable,
  beltDefinitionsTable,
  fightsTable,
  anthropometricEvaluationsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import bcrypt from "bcryptjs";
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
        sedes: usersTable.sedes,
        membershipStatus: usersTable.membershipStatus,
        membershipExpiresAt: usersTable.membershipExpiresAt,
        trialEndsAt: usersTable.trialEndsAt,
        lastPaymentAt: usersTable.lastPaymentAt,
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

    const [weightRow] = await db
      .select({
        initialWeight: anthropometricEvaluationsTable.initialWeight,
        currentWeight: anthropometricEvaluationsTable.currentWeight,
        targetWeight: anthropometricEvaluationsTable.targetWeight,
      })
      .from(anthropometricEvaluationsTable)
      .where(eq(anthropometricEvaluationsTable.userId, userId))
      .limit(1);

    const weightData = weightRow || null;

    res.json({
      profile: {
        ...user,
        roles: roles.map((r) => r.role),
        belts,
        fightStats,
        weightData,
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
    const { displayName, phone, sedes, currentPassword, newPassword } = req.body;

    if (displayName !== undefined && typeof displayName !== "string") {
      res.status(400).json({ error: "Nombre inválido" });
      return;
    }
    if (phone !== undefined && phone !== null && typeof phone !== "string") {
      res.status(400).json({ error: "Teléfono inválido" });
      return;
    }
    if (sedes !== undefined) {
      if (!Array.isArray(sedes) || sedes.some((s: unknown) => s !== "bogota" && s !== "chia")) {
        res.status(400).json({ error: "Sedes inválidas" });
        return;
      }
    }

    const trimmedName = displayName?.trim();
    if (trimmedName !== undefined && trimmedName.length === 0) {
      res.status(400).json({ error: "El nombre no puede estar vacío" });
      return;
    }

    const updates: { displayName?: string; phone?: string | null; sedes?: string[]; passwordHash?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (trimmedName !== undefined) updates.displayName = trimmedName;
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (sedes !== undefined) updates.sedes = sedes;

    if (newPassword !== undefined) {
      if (!currentPassword) {
        res.status(400).json({ error: "Debes ingresar tu contraseña actual" });
        return;
      }
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres" });
        return;
      }
      const [userRow] = await db
        .select({ passwordHash: usersTable.passwordHash })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!userRow) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, userRow.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "La contraseña actual no es correcta" });
        return;
      }
      updates.passwordHash = await bcrypt.hash(newPassword, 12);
    }

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
        sedes: usersTable.sedes,
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

profileRouter.patch("/profile/me/weight", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { currentWeight } = req.body;

    if (currentWeight === undefined || currentWeight === null) {
      res.status(400).json({ error: "Se requiere el peso actual" });
      return;
    }
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      res.status(400).json({ error: "Peso inválido" });
      return;
    }

    const [existing] = await db
      .select()
      .from(anthropometricEvaluationsTable)
      .where(eq(anthropometricEvaluationsTable.userId, userId))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(anthropometricEvaluationsTable)
        .set({ currentWeight: weight, updatedAt: new Date() })
        .where(eq(anthropometricEvaluationsTable.userId, userId))
        .returning({
          initialWeight: anthropometricEvaluationsTable.initialWeight,
          currentWeight: anthropometricEvaluationsTable.currentWeight,
          targetWeight: anthropometricEvaluationsTable.targetWeight,
        });
    } else {
      [result] = await db
        .insert(anthropometricEvaluationsTable)
        .values({ userId, currentWeight: weight })
        .returning({
          initialWeight: anthropometricEvaluationsTable.initialWeight,
          currentWeight: anthropometricEvaluationsTable.currentWeight,
          targetWeight: anthropometricEvaluationsTable.targetWeight,
        });
    }

    res.json({ weightData: result });
  } catch (error) {
    console.error("Update weight error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

profileRouter.put("/profile/me/fighter", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { isFighter } = req.body as { isFighter: boolean };
    const [updated] = await db
      .update(usersTable)
      .set({ isFighter: !!isFighter, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({ isFighter: usersTable.isFighter });
    if (!updated) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json({ success: true, isFighter: updated.isFighter });
  } catch (error) {
    console.error("Toggle fighter error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default profileRouter;
