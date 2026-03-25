import { Router } from "express";
import { db, suggestionsTable, notificationsTable, userRolesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, requireProfesorOrAdmin } from "../middlewares/auth";
import { notifyUser, notifyAllAdmins } from "../lib/push";

const suggestionsRouter = Router();

suggestionsRouter.post("/suggestions", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { content } = req.body as { content?: string };

    if (!content?.trim()) {
      res.status(400).json({ error: "El contenido de la sugerencia es requerido" });
      return;
    }

    if (content.trim().length > 1000) {
      res.status(400).json({ error: "La sugerencia no puede superar los 1000 caracteres" });
      return;
    }

    await db.insert(suggestionsTable).values({
      userId,
      content: content.trim(),
    });

    const adminRows = await db
      .select({ userId: userRolesTable.userId })
      .from(userRolesTable)
      .where(eq(userRolesTable.role, "admin"));

    const adminIds = adminRows.map((r) => r.userId);

    if (adminIds.length > 0) {
      await db.insert(notificationsTable).values(
        adminIds.map((adminId) => ({
          title: "Nueva sugerencia anónima",
          body: "Un miembro ha enviado una nueva sugerencia. Revísala en el panel de admin.",
          target: "personal" as const,
          targetUserId: adminId,
          createdByUserId: userId,
        }))
      );
      void notifyAllAdmins(
        "💬 Nueva sugerencia",
        "Un miembro ha enviado una nueva sugerencia anónima."
      );
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Create suggestion error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

suggestionsRouter.get("/admin/suggestions", requireProfesorOrAdmin, async (req, res) => {
  try {
    const suggestions = await db
      .select({
        id: suggestionsTable.id,
        content: suggestionsTable.content,
        isReviewed: suggestionsTable.isReviewed,
        reviewedAt: suggestionsTable.reviewedAt,
        createdAt: suggestionsTable.createdAt,
      })
      .from(suggestionsTable)
      .orderBy(desc(suggestionsTable.createdAt));

    res.json({ suggestions });
  } catch (error) {
    console.error("Get suggestions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

suggestionsRouter.get("/admin/suggestions/unreviewed-count", requireProfesorOrAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({ id: suggestionsTable.id })
      .from(suggestionsTable)
      .where(eq(suggestionsTable.isReviewed, false));

    res.json({ count: rows.length });
  } catch (error) {
    console.error("Unreviewed suggestions count error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

suggestionsRouter.put("/admin/suggestions/:id/reviewed", requireAdmin, async (req, res) => {
  try {
    const adminId = req.session.userId!;
    const suggestionId = parseInt(String(req.params.id), 10);

    if (isNaN(suggestionId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const [suggestion] = await db
      .select({ id: suggestionsTable.id, userId: suggestionsTable.userId, isReviewed: suggestionsTable.isReviewed })
      .from(suggestionsTable)
      .where(eq(suggestionsTable.id, suggestionId))
      .limit(1);

    if (!suggestion) {
      res.status(404).json({ error: "Sugerencia no encontrada" });
      return;
    }

    if (suggestion.isReviewed) {
      res.json({ ok: true, alreadyReviewed: true });
      return;
    }

    await db
      .update(suggestionsTable)
      .set({ isReviewed: true, reviewedAt: new Date() })
      .where(eq(suggestionsTable.id, suggestionId));

    const notifTitle = "Tu sugerencia fue revisada";
    const notifBody = "Un administrador ha revisado tu sugerencia. ¡Gracias por ayudarnos a mejorar!";

    await db.insert(notificationsTable).values({
      title: notifTitle,
      body: notifBody,
      target: "personal",
      targetUserId: suggestion.userId,
      createdByUserId: adminId,
    });

    void notifyUser(suggestion.userId, notifTitle, notifBody);

    res.json({ ok: true });
  } catch (error) {
    console.error("Review suggestion error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

suggestionsRouter.delete("/admin/suggestions/:id", requireAdmin, async (req, res) => {
  try {
    const suggestionId = parseInt(String(req.params.id), 10);

    if (isNaN(suggestionId)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    await db.delete(suggestionsTable).where(eq(suggestionsTable.id, suggestionId));

    res.json({ ok: true });
  } catch (error) {
    console.error("Delete suggestion error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default suggestionsRouter;
