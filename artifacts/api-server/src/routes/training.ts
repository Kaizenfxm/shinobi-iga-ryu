import { Router, raw } from "express";
import {
  db,
  trainingSystemsTable,
  exercisesTable,
  knowledgeItemsTable,
  exerciseCategoriesTable,
  knowledgeCategoriesTable,
  exercisePrerequisitesTable,
  userExerciseCompletionsTable,
  knowledgePrerequisitesTable,
  userKnowledgeViewsTable,
  studentBeltsTable,
  beltDefinitionsTable,
  classAttendancesTable,
  challengesTable,
  userRolesTable,
} from "@workspace/db";
import { eq, asc, and, count, inArray, or } from "drizzle-orm";
import { requireAuth, requireAdmin, requireProfesorOrAdmin } from "../middlewares/auth";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

async function validateExerciseCategoryBelongsToSystem(categoryId: number, trainingSystemId: number): Promise<boolean> {
  const [cat] = await db.select().from(exerciseCategoriesTable).where(eq(exerciseCategoriesTable.id, categoryId)).limit(1);
  return !!cat && cat.trainingSystemId === trainingSystemId;
}

async function validateKnowledgeCategoryBelongsToSystem(categoryId: number, trainingSystemId: number): Promise<boolean> {
  const [cat] = await db.select().from(knowledgeCategoriesTable).where(eq(knowledgeCategoriesTable.id, categoryId)).limit(1);
  return !!cat && cat.trainingSystemId === trainingSystemId;
}

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
    const userId = req.session.userId!;

    const [system] = await db
      .select()
      .from(trainingSystemsTable)
      .where(eq(trainingSystemsTable.key, key))
      .limit(1);

    if (!system) {
      res.status(404).json({ error: "Sistema no encontrado" });
      return;
    }

    const [privilegedRole] = await db
      .select({ id: userRolesTable.id })
      .from(userRolesTable)
      .where(and(
        eq(userRolesTable.userId, userId),
        or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
      ))
      .limit(1);
    const isPrivileged = !!privilegedRole;

    const exercisesWhere = isPrivileged
      ? eq(exercisesTable.trainingSystemId, system.id)
      : and(eq(exercisesTable.trainingSystemId, system.id), eq(exercisesTable.isActive, true));

    const knowledgeWhere = isPrivileged
      ? eq(knowledgeItemsTable.trainingSystemId, system.id)
      : and(eq(knowledgeItemsTable.trainingSystemId, system.id), eq(knowledgeItemsTable.isActive, true));

    const exerciseCatWhere = isPrivileged
      ? eq(exerciseCategoriesTable.trainingSystemId, system.id)
      : and(eq(exerciseCategoriesTable.trainingSystemId, system.id), eq(exerciseCategoriesTable.isActive, true));

    const knowledgeCatWhere = isPrivileged
      ? eq(knowledgeCategoriesTable.trainingSystemId, system.id)
      : and(eq(knowledgeCategoriesTable.trainingSystemId, system.id), eq(knowledgeCategoriesTable.isActive, true));

    const [exercises, knowledge, exerciseCategories, knowledgeCategories] = await Promise.all([
      db.select().from(exercisesTable).where(exercisesWhere).orderBy(asc(exercisesTable.orderIndex), asc(exercisesTable.id)),
      db.select().from(knowledgeItemsTable).where(knowledgeWhere).orderBy(asc(knowledgeItemsTable.orderIndex), asc(knowledgeItemsTable.id)),
      db.select().from(exerciseCategoriesTable).where(exerciseCatWhere).orderBy(asc(exerciseCategoriesTable.orderIndex), asc(exerciseCategoriesTable.id)),
      db.select().from(knowledgeCategoriesTable).where(knowledgeCatWhere).orderBy(asc(knowledgeCategoriesTable.orderIndex), asc(knowledgeCategoriesTable.id)),
    ]);

    const exerciseIds = exercises.map((e) => e.id);
    const knowledgeIds = knowledge.map((k) => k.id);

    const [userBelts, winsResult, attResult, beltDefs, allPrereqs, completions, allKnowledgePrereqs, knowledgeViews] = await Promise.all([
      db
        .select({ discipline: studentBeltsTable.discipline, orderIndex: beltDefinitionsTable.orderIndex })
        .from(studentBeltsTable)
        .innerJoin(beltDefinitionsTable, eq(beltDefinitionsTable.id, studentBeltsTable.currentBeltId))
        .where(eq(studentBeltsTable.userId, userId)),

      db
        .select({ count: count() })
        .from(challengesTable)
        .where(and(eq(challengesTable.winnerId, userId), eq(challengesTable.status, "completed"))),

      db
        .select({ count: count() })
        .from(classAttendancesTable)
        .where(eq(classAttendancesTable.userId, userId)),

      db
        .select({ discipline: beltDefinitionsTable.discipline, orderIndex: beltDefinitionsTable.orderIndex, name: beltDefinitionsTable.name })
        .from(beltDefinitionsTable),

      exerciseIds.length > 0
        ? db
            .select({
              exerciseId: exercisePrerequisitesTable.exerciseId,
              prerequisiteExerciseId: exercisePrerequisitesTable.prerequisiteExerciseId,
            })
            .from(exercisePrerequisitesTable)
            .where(inArray(exercisePrerequisitesTable.exerciseId, exerciseIds))
        : Promise.resolve([]),

      exerciseIds.length > 0
        ? db
            .select({ exerciseId: userExerciseCompletionsTable.exerciseId })
            .from(userExerciseCompletionsTable)
            .where(and(eq(userExerciseCompletionsTable.userId, userId), inArray(userExerciseCompletionsTable.exerciseId, exerciseIds)))
        : Promise.resolve([]),

      knowledgeIds.length > 0
        ? db
            .select({
              knowledgeItemId: knowledgePrerequisitesTable.knowledgeItemId,
              prerequisiteKnowledgeItemId: knowledgePrerequisitesTable.prerequisiteKnowledgeItemId,
            })
            .from(knowledgePrerequisitesTable)
            .where(inArray(knowledgePrerequisitesTable.knowledgeItemId, knowledgeIds))
        : Promise.resolve([]),

      knowledgeIds.length > 0
        ? db
            .select({ knowledgeItemId: userKnowledgeViewsTable.knowledgeItemId })
            .from(userKnowledgeViewsTable)
            .where(and(eq(userKnowledgeViewsTable.userId, userId), inArray(userKnowledgeViewsTable.knowledgeItemId, knowledgeIds)))
        : Promise.resolve([]),
    ]);

    const userBeltMap: Record<string, number> = {};
    for (const b of userBelts) {
      userBeltMap[b.discipline] = b.orderIndex;
    }

    const userWins = winsResult[0]?.count ?? 0;
    const userAttendances = attResult[0]?.count ?? 0;

    const beltNameMap: Record<string, string> = {};
    for (const bd of beltDefs) {
      beltNameMap[`${bd.discipline}:${bd.orderIndex}`] = bd.name;
    }

    const prereqMap: Record<number, number[]> = {};
    for (const p of allPrereqs) {
      if (!prereqMap[p.exerciseId]) prereqMap[p.exerciseId] = [];
      prereqMap[p.exerciseId].push(p.prerequisiteExerciseId);
    }

    const completedExerciseIds = new Set<number>(completions.map((c) => c.exerciseId));

    const exerciseTitleMap: Record<number, string> = {};
    for (const e of exercises) {
      exerciseTitleMap[e.id] = e.title;
    }

    const knowledgePrereqMap: Record<number, number[]> = {};
    for (const p of allKnowledgePrereqs) {
      if (!knowledgePrereqMap[p.knowledgeItemId]) knowledgePrereqMap[p.knowledgeItemId] = [];
      knowledgePrereqMap[p.knowledgeItemId].push(p.prerequisiteKnowledgeItemId);
    }

    const viewedKnowledgeIds = new Set<number>(knowledgeViews.map((v) => v.knowledgeItemId));

    const knowledgeTitleMap: Record<number, string> = {};
    for (const k of knowledge) {
      knowledgeTitleMap[k.id] = k.title;
    }

    const exercisesWithMeta = exercises.map((e) => {
      let isLocked = false;
      let lockReason: string | null = null;

      if (isPrivileged) {
        return {
          ...e,
          categoryId: e.exerciseCategoryId,
          isLocked: false,
          lockReason: null,
          completedByUser: completedExerciseIds.has(e.id),
          prerequisiteIds: prereqMap[e.id] ?? [],
        };
      }

      if (e.reqBeltDiscipline && e.reqBeltMinOrder !== null && e.reqBeltMinOrder !== undefined) {
        const userOrder = userBeltMap[e.reqBeltDiscipline] ?? -1;
        if (userOrder < e.reqBeltMinOrder) {
          const beltName = beltNameMap[`${e.reqBeltDiscipline}:${e.reqBeltMinOrder}`] ?? `nivel ${e.reqBeltMinOrder}`;
          const disc = e.reqBeltDiscipline === "ninjutsu" ? "Ninjutsu" : e.reqBeltDiscipline === "jiujitsu" ? "Jiujitsu" : e.reqBeltDiscipline;
          isLocked = true;
          lockReason = `Requiere cinturón ${beltName} de ${disc}`;
        }
      }

      if (!isLocked && e.reqMinWins !== null && e.reqMinWins !== undefined && e.reqMinWins > 0) {
        if (userWins < e.reqMinWins) {
          isLocked = true;
          lockReason = `Requiere ${e.reqMinWins} ${e.reqMinWins === 1 ? "victoria" : "victorias"} (tienes ${userWins})`;
        }
      }

      if (!isLocked && e.reqMinAttendances !== null && e.reqMinAttendances !== undefined && e.reqMinAttendances > 0) {
        if (userAttendances < e.reqMinAttendances) {
          isLocked = true;
          lockReason = `Requiere ${e.reqMinAttendances} ${e.reqMinAttendances === 1 ? "clase" : "clases"} (tienes ${userAttendances})`;
        }
      }

      if (!isLocked) {
        const prereqs = prereqMap[e.id] ?? [];
        const missing = prereqs.filter((pid) => !completedExerciseIds.has(pid));
        if (missing.length > 0) {
          const titles = missing.map((pid) => exerciseTitleMap[pid] ?? `Ejercicio ${pid}`).join(", ");
          isLocked = true;
          lockReason = `Requiere completar: ${titles}`;
        }
      }

      return {
        ...e,
        categoryId: e.exerciseCategoryId,
        isLocked,
        lockReason,
        completedByUser: completedExerciseIds.has(e.id),
        prerequisiteIds: prereqMap[e.id] ?? [],
      };
    });

    const knowledgeWithMeta = knowledge.map((k) => {
      if (isPrivileged) {
        return {
          ...k,
          categoryId: k.knowledgeCategoryId,
          isLocked: false,
          lockReason: null,
          viewedByUser: viewedKnowledgeIds.has(k.id),
          prerequisiteIds: knowledgePrereqMap[k.id] ?? [],
        };
      }

      const prereqs = knowledgePrereqMap[k.id] ?? [];
      const missing = prereqs.filter((pid) => !viewedKnowledgeIds.has(pid));
      if (missing.length > 0) {
        const titles = missing.map((pid) => knowledgeTitleMap[pid] ?? `Conocimiento ${pid}`).join(", ");
        return {
          ...k,
          categoryId: k.knowledgeCategoryId,
          isLocked: true,
          lockReason: `Requiere leer primero: ${titles}`,
          viewedByUser: viewedKnowledgeIds.has(k.id),
          prerequisiteIds: prereqs,
        };
      }

      return {
        ...k,
        categoryId: k.knowledgeCategoryId,
        isLocked: false,
        lockReason: null,
        viewedByUser: viewedKnowledgeIds.has(k.id),
        prerequisiteIds: prereqs,
      };
    });

    res.json({ system, exercises: exercisesWithMeta, knowledge: knowledgeWithMeta, exerciseCategories, knowledgeCategories });
  } catch (error) {
    console.error("Get training system detail error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.get("/training/systems/:key/exercise-categories", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key);
    const [system] = await db.select().from(trainingSystemsTable).where(eq(trainingSystemsTable.key, key)).limit(1);
    if (!system) { res.status(404).json({ error: "Sistema no encontrado" }); return; }

    const categories = await db
      .select()
      .from(exerciseCategoriesTable)
      .where(eq(exerciseCategoriesTable.trainingSystemId, system.id))
      .orderBy(asc(exerciseCategoriesTable.orderIndex), asc(exerciseCategoriesTable.id));
    res.json({ categories });
  } catch (error) {
    console.error("Get exercise categories error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.get("/training/systems/:key/knowledge-categories", requireAuth, async (req, res) => {
  try {
    const key = String(req.params.key);
    const [system] = await db.select().from(trainingSystemsTable).where(eq(trainingSystemsTable.key, key)).limit(1);
    if (!system) { res.status(404).json({ error: "Sistema no encontrado" }); return; }

    const categories = await db
      .select()
      .from(knowledgeCategoriesTable)
      .where(eq(knowledgeCategoriesTable.trainingSystemId, system.id))
      .orderBy(asc(knowledgeCategoriesTable.orderIndex), asc(knowledgeCategoriesTable.id));
    res.json({ categories });
  } catch (error) {
    console.error("Get knowledge categories error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/training/exercises/:id/complete", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    const userId = req.session.userId!;

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, id))
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: "Ejercicio no encontrado" });
      return;
    }

    const [privilegedRole] = await db
      .select({ id: userRolesTable.id })
      .from(userRolesTable)
      .where(and(
        eq(userRolesTable.userId, userId),
        or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor"))
      ))
      .limit(1);
    const isPrivileged = !!privilegedRole;

    if (!isPrivileged) {
      if (!exercise.isActive) {
        res.status(403).json({ error: "Ejercicio no disponible" });
        return;
      }

      const [userBelts, winsResult, attResult, prereqs, completions] = await Promise.all([
        db
          .select({ discipline: studentBeltsTable.discipline, orderIndex: beltDefinitionsTable.orderIndex })
          .from(studentBeltsTable)
          .innerJoin(beltDefinitionsTable, eq(beltDefinitionsTable.id, studentBeltsTable.currentBeltId))
          .where(eq(studentBeltsTable.userId, userId)),
        db
          .select({ count: count() })
          .from(challengesTable)
          .where(and(eq(challengesTable.winnerId, userId), eq(challengesTable.status, "completed"))),
        db
          .select({ count: count() })
          .from(classAttendancesTable)
          .where(eq(classAttendancesTable.userId, userId)),
        db
          .select({ prerequisiteExerciseId: exercisePrerequisitesTable.prerequisiteExerciseId })
          .from(exercisePrerequisitesTable)
          .where(eq(exercisePrerequisitesTable.exerciseId, id)),
        db
          .select({ exerciseId: userExerciseCompletionsTable.exerciseId })
          .from(userExerciseCompletionsTable)
          .where(eq(userExerciseCompletionsTable.userId, userId)),
      ]);

      const userBeltMap: Record<string, number> = {};
      for (const b of userBelts) userBeltMap[b.discipline] = b.orderIndex;

      const userWins = winsResult[0]?.count ?? 0;
      const userAttendances = attResult[0]?.count ?? 0;
      const completedIds = new Set<number>(completions.map((c) => c.exerciseId));

      if (exercise.reqBeltDiscipline && exercise.reqBeltMinOrder !== null && exercise.reqBeltMinOrder !== undefined) {
        const userOrder = userBeltMap[exercise.reqBeltDiscipline] ?? -1;
        if (userOrder < exercise.reqBeltMinOrder) {
          res.status(403).json({ error: "No cumples el requisito de cinturón" });
          return;
        }
      }

      if (exercise.reqMinWins !== null && exercise.reqMinWins !== undefined && exercise.reqMinWins > 0) {
        if (userWins < exercise.reqMinWins) {
          res.status(403).json({ error: "No cumples el requisito de victorias" });
          return;
        }
      }

      if (exercise.reqMinAttendances !== null && exercise.reqMinAttendances !== undefined && exercise.reqMinAttendances > 0) {
        if (userAttendances < exercise.reqMinAttendances) {
          res.status(403).json({ error: "No cumples el requisito de asistencias" });
          return;
        }
      }

      const missingPrereqs = prereqs.filter((p) => !completedIds.has(p.prerequisiteExerciseId));
      if (missingPrereqs.length > 0) {
        res.status(403).json({ error: "No has completado los ejercicios prerrequisitos" });
        return;
      }
    }

    await db
      .insert(userExerciseCompletionsTable)
      .values({ userId, exerciseId: id })
      .onConflictDoNothing();

    res.json({ completed: true });
  } catch (error) {
    console.error("Complete exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/category-image-upload", requireProfesorOrAdmin, raw({ limit: "15mb", type: "image/*" }), async (req, res) => {
  try {
    const contentType = (req.headers["content-type"] || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      res.status(400).json({ error: "Tipo de archivo inválido" });
      return;
    }
    const objectPath = await objectStorageService.uploadBuffer(req.body as Buffer, contentType, 1200, 1200);
    res.json({ objectPath });
  } catch (error) {
    console.error("Category image upload error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.get("/admin/training/exercises/:id/prerequisites", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const prereqs = await db
      .select({ id: exercisesTable.id, title: exercisesTable.title })
      .from(exercisePrerequisitesTable)
      .innerJoin(exercisesTable, eq(exercisesTable.id, exercisePrerequisitesTable.prerequisiteExerciseId))
      .where(eq(exercisePrerequisitesTable.exerciseId, id));

    res.json({ prerequisites: prereqs });
  } catch (error) {
    console.error("Get exercise prerequisites error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/exercise-categories", requireProfesorOrAdmin, async (req, res) => {
  try {
    const { trainingSystemId, name, description, imageUrl, orderIndex } = req.body as {
      trainingSystemId?: number;
      name?: string;
      description?: string;
      imageUrl?: string;
      orderIndex?: number;
    };
    if (!trainingSystemId || !name?.trim()) {
      res.status(400).json({ error: "Sistema y nombre son requeridos" });
      return;
    }
    const [category] = await db
      .insert(exerciseCategoriesTable)
      .values({
        trainingSystemId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        orderIndex: orderIndex ?? 0,
      })
      .returning();
    res.json({ category });
  } catch (error) {
    console.error("Create exercise category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/exercise-categories/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const { name, description, imageUrl, orderIndex, isActive } = req.body;
    const updates: Partial<typeof exerciseCategoriesTable.$inferInsert> = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(exerciseCategoriesTable)
      .set(updates)
      .where(eq(exerciseCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Categoría no encontrada" }); return; }
    res.json({ category: updated });
  } catch (error) {
    console.error("Update exercise category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/exercise-categories/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    await db.delete(exerciseCategoriesTable).where(eq(exerciseCategoriesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete exercise category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/knowledge-categories", requireProfesorOrAdmin, async (req, res) => {
  try {
    const { trainingSystemId, name, description, imageUrl, orderIndex } = req.body as {
      trainingSystemId?: number;
      name?: string;
      description?: string;
      imageUrl?: string;
      orderIndex?: number;
    };
    if (!trainingSystemId || !name?.trim()) {
      res.status(400).json({ error: "Sistema y nombre son requeridos" });
      return;
    }
    const [category] = await db
      .insert(knowledgeCategoriesTable)
      .values({
        trainingSystemId,
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        orderIndex: orderIndex ?? 0,
      })
      .returning();
    res.json({ category });
  } catch (error) {
    console.error("Create knowledge category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/knowledge-categories/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }

    const { name, description, imageUrl, orderIndex, isActive } = req.body;
    const updates: Partial<typeof knowledgeCategoriesTable.$inferInsert> = {};
    if (name !== undefined && name.trim()) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const [updated] = await db
      .update(knowledgeCategoriesTable)
      .set(updates)
      .where(eq(knowledgeCategoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Categoría no encontrada" }); return; }
    res.json({ category: updated });
  } catch (error) {
    console.error("Update knowledge category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/knowledge-categories/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) { res.status(400).json({ error: "ID inválido" }); return; }
    await db.delete(knowledgeCategoriesTable).where(eq(knowledgeCategoriesTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete knowledge category error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/admin/training/exercises", requireProfesorOrAdmin, async (req, res) => {
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
      categoryId: rawCategoryId,
      exerciseCategoryId: rawExCategoryId,
      reqBeltDiscipline,
      reqBeltMinOrder,
      reqMinWins,
      reqMinAttendances,
      prerequisiteIds,
    } = req.body as {
      trainingSystemId?: number;
      title?: string;
      description?: string;
      videoUrl?: string;
      imageUrl?: string;
      durationMinutes?: number;
      level?: string;
      orderIndex?: number;
      categoryId?: number;
      exerciseCategoryId?: number;
      reqBeltDiscipline?: string;
      reqBeltMinOrder?: number;
      reqMinWins?: number;
      reqMinAttendances?: number;
      prerequisiteIds?: number[];
    };
    const categoryId = rawCategoryId ?? rawExCategoryId;

    if (!trainingSystemId || !title?.trim()) {
      res.status(400).json({ error: "Sistema y título son requeridos" });
      return;
    }

    if (categoryId) {
      const valid = await validateExerciseCategoryBelongsToSystem(categoryId, trainingSystemId);
      if (!valid) {
        res.status(400).json({ error: "La categoría no pertenece a este sistema" });
        return;
      }
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
        exerciseCategoryId: categoryId ?? null,
        reqBeltDiscipline: reqBeltDiscipline?.trim() || null,
        reqBeltMinOrder: reqBeltMinOrder ?? null,
        reqMinWins: reqMinWins ?? null,
        reqMinAttendances: reqMinAttendances ?? null,
      })
      .returning();

    if (prerequisiteIds && prerequisiteIds.length > 0) {
      await db.insert(exercisePrerequisitesTable).values(
        prerequisiteIds.map((pid) => ({ exerciseId: exercise.id, prerequisiteExerciseId: pid }))
      ).onConflictDoNothing();
    }

    res.json({ exercise: { ...exercise, categoryId: exercise.exerciseCategoryId, prerequisiteIds: prerequisiteIds ?? [] } });
  } catch (error) {
    console.error("Create exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/exercises/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const {
      title, description, videoUrl, imageUrl, durationMinutes, level, orderIndex, isActive,
      categoryId: rawCatId, exerciseCategoryId: rawExCatId,
      reqBeltDiscipline, reqBeltMinOrder, reqMinWins, reqMinAttendances, prerequisiteIds,
    } = req.body;
    const resolvedCategoryId = rawCatId !== undefined ? rawCatId : rawExCatId;

    if (resolvedCategoryId) {
      const [existing] = await db.select({ trainingSystemId: exercisesTable.trainingSystemId }).from(exercisesTable).where(eq(exercisesTable.id, id)).limit(1);
      if (existing) {
        const valid = await validateExerciseCategoryBelongsToSystem(resolvedCategoryId, existing.trainingSystemId);
        if (!valid) {
          res.status(400).json({ error: "La categoría no pertenece a este sistema" });
          return;
        }
      }
    }

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
    if (resolvedCategoryId !== undefined) updates.exerciseCategoryId = resolvedCategoryId ?? null;
    if (reqBeltDiscipline !== undefined) updates.reqBeltDiscipline = reqBeltDiscipline?.trim() || null;
    if (reqBeltMinOrder !== undefined) updates.reqBeltMinOrder = reqBeltMinOrder ?? null;
    if (reqMinWins !== undefined) updates.reqMinWins = reqMinWins ?? null;
    if (reqMinAttendances !== undefined) updates.reqMinAttendances = reqMinAttendances ?? null;

    const [updated] = await db
      .update(exercisesTable)
      .set(updates)
      .where(eq(exercisesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Ejercicio no encontrado" });
      return;
    }

    if (prerequisiteIds !== undefined) {
      await db.delete(exercisePrerequisitesTable).where(eq(exercisePrerequisitesTable.exerciseId, id));
      if (prerequisiteIds.length > 0) {
        await db.insert(exercisePrerequisitesTable).values(
          prerequisiteIds.map((pid: number) => ({ exerciseId: id, prerequisiteExerciseId: pid }))
        ).onConflictDoNothing();
      }
    }

    const currentPrereqs = await db
      .select({ prerequisiteExerciseId: exercisePrerequisitesTable.prerequisiteExerciseId })
      .from(exercisePrerequisitesTable)
      .where(eq(exercisePrerequisitesTable.exerciseId, id));

    res.json({ exercise: { ...updated, categoryId: updated.exerciseCategoryId, prerequisiteIds: currentPrereqs.map((p) => p.prerequisiteExerciseId) } });
  } catch (error) {
    console.error("Update exercise error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/exercises/:id", requireProfesorOrAdmin, async (req, res) => {
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

trainingRouter.post("/admin/training/knowledge", requireProfesorOrAdmin, async (req, res) => {
  try {
    const {
      trainingSystemId,
      title,
      content,
      videoUrl,
      imageUrl,
      orderIndex,
      categoryId: rawCategoryId,
      knowledgeCategoryId: rawKnCategoryId,
    } = req.body as {
      trainingSystemId?: number;
      title?: string;
      content?: string;
      videoUrl?: string;
      imageUrl?: string;
      orderIndex?: number;
      categoryId?: number;
      knowledgeCategoryId?: number;
    };
    const categoryId = rawCategoryId ?? rawKnCategoryId;

    if (!trainingSystemId || !title?.trim()) {
      res.status(400).json({ error: "Sistema y título son requeridos" });
      return;
    }

    if (categoryId) {
      const valid = await validateKnowledgeCategoryBelongsToSystem(categoryId, trainingSystemId);
      if (!valid) {
        res.status(400).json({ error: "La categoría no pertenece a este sistema" });
        return;
      }
    }

    const prerequisiteIds: number[] | undefined = req.body.prerequisiteIds;

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
        knowledgeCategoryId: categoryId ?? null,
      })
      .returning();

    if (prerequisiteIds && prerequisiteIds.length > 0) {
      await db.insert(knowledgePrerequisitesTable).values(
        prerequisiteIds.map((pid) => ({ knowledgeItemId: item.id, prerequisiteKnowledgeItemId: pid }))
      );
    }

    res.json({ item: { ...item, categoryId: item.knowledgeCategoryId, prerequisiteIds: prerequisiteIds ?? [] } });
  } catch (error) {
    console.error("Create knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.put("/admin/training/knowledge/:id", requireProfesorOrAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const { title, content, videoUrl, imageUrl, orderIndex, isActive, categoryId: rawCatId, knowledgeCategoryId: rawKnCatId, prerequisiteIds } = req.body;
    const resolvedCategoryId = rawCatId !== undefined ? rawCatId : rawKnCatId;

    if (resolvedCategoryId) {
      const [existing] = await db.select({ trainingSystemId: knowledgeItemsTable.trainingSystemId }).from(knowledgeItemsTable).where(eq(knowledgeItemsTable.id, id)).limit(1);
      if (existing) {
        const valid = await validateKnowledgeCategoryBelongsToSystem(resolvedCategoryId, existing.trainingSystemId);
        if (!valid) {
          res.status(400).json({ error: "La categoría no pertenece a este sistema" });
          return;
        }
      }
    }

    const updates: Partial<typeof knowledgeItemsTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (title !== undefined && title.trim()) updates.title = title.trim();
    if (content !== undefined) updates.content = content?.trim() || null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl?.trim() || null;
    if (imageUrl !== undefined) updates.imageUrl = imageUrl?.trim() || null;
    if (orderIndex !== undefined) updates.orderIndex = orderIndex;
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (resolvedCategoryId !== undefined) updates.knowledgeCategoryId = resolvedCategoryId ?? null;

    const [updated] = await db
      .update(knowledgeItemsTable)
      .set(updates)
      .where(eq(knowledgeItemsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Item no encontrado" });
      return;
    }

    if (prerequisiteIds !== undefined) {
      await db.delete(knowledgePrerequisitesTable).where(eq(knowledgePrerequisitesTable.knowledgeItemId, id));
      if (Array.isArray(prerequisiteIds) && prerequisiteIds.length > 0) {
        await db.insert(knowledgePrerequisitesTable).values(
          prerequisiteIds.map((pid: number) => ({ knowledgeItemId: id, prerequisiteKnowledgeItemId: pid }))
        );
      }
    }

    const currentPrereqs = await db
      .select({ prerequisiteKnowledgeItemId: knowledgePrerequisitesTable.prerequisiteKnowledgeItemId })
      .from(knowledgePrerequisitesTable)
      .where(eq(knowledgePrerequisitesTable.knowledgeItemId, id));

    res.json({ item: { ...updated, categoryId: updated.knowledgeCategoryId, prerequisiteIds: currentPrereqs.map((p) => p.prerequisiteKnowledgeItemId) } });
  } catch (error) {
    console.error("Update knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.patch("/admin/training/exercises/reorder", requireProfesorOrAdmin, async (req, res) => {
  try {
    const items = req.body.items as { id: number; orderIndex: number }[];
    if (!Array.isArray(items)) {
      res.status(400).json({ error: "items debe ser un arreglo" });
      return;
    }
    await db.transaction(async (tx) => {
      for (const item of items) {
        const id = typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
        const idx = typeof item.orderIndex === "number" ? item.orderIndex : parseInt(String(item.orderIndex), 10);
        await tx.update(exercisesTable).set({ orderIndex: idx }).where(eq(exercisesTable.id, id));
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Reorder exercises error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.post("/training/knowledge/:id/view", requireAuth, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const userId = req.session.userId!;
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    await db
      .insert(userKnowledgeViewsTable)
      .values({ userId, knowledgeItemId: id })
      .onConflictDoNothing();
    res.json({ viewed: true });
  } catch (error) {
    console.error("View knowledge item error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

trainingRouter.delete("/admin/training/knowledge/:id", requireProfesorOrAdmin, async (req, res) => {
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
