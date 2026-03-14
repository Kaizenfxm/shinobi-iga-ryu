import { Router } from "express";
import { db, usersTable, userRolesTable, profesorStudentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/admin/users", async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        isFighter: usersTable.isFighter,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable);

    const allRoles = await db
      .select({
        userId: userRolesTable.userId,
        role: userRolesTable.role,
      })
      .from(userRolesTable);

    const rolesByUser = new Map<number, string[]>();
    for (const r of allRoles) {
      const existing = rolesByUser.get(r.userId) || [];
      existing.push(r.role);
      rolesByUser.set(r.userId, existing);
    }

    const usersWithRoles = users.map((u) => ({
      ...u,
      roles: rolesByUser.get(u.id) || [],
    }));

    res.json({ users: usersWithRoles });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/users/:id/roles", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }
    const { roles } = req.body;

    if (!Array.isArray(roles)) {
      res.status(400).json({ error: "Se requiere un array de roles" });
      return;
    }

    const validRoles = ["admin", "profesor", "alumno"] as const;
    const filteredRoles = roles.filter((r: string) =>
      validRoles.includes(r as typeof validRoles[number])
    );

    if (filteredRoles.length === 0) {
      res.status(400).json({ error: "Se requiere al menos un rol válido" });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    await db.delete(userRolesTable).where(eq(userRolesTable.userId, userId));

    for (const role of filteredRoles) {
      await db.insert(userRolesTable).values({
        userId,
        role: role as typeof validRoles[number],
      });
    }

    res.json({ success: true, roles: filteredRoles });
  } catch (error) {
    console.error("Admin update roles error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/users/:id/subscription", async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }
    const { subscriptionLevel } = req.body;

    const validLevels = ["basico", "medio", "avanzado", "personalizado"] as const;
    if (!validLevels.includes(subscriptionLevel as typeof validLevels[number])) {
      res.status(400).json({ error: "Nivel de suscripción inválido" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set({
        subscriptionLevel: subscriptionLevel as typeof validLevels[number],
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        subscriptionLevel: usersTable.subscriptionLevel,
      });

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ success: true, subscriptionLevel: user.subscriptionLevel });
  } catch (error) {
    console.error("Admin update subscription error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.get("/admin/profesor/:profesorId/alumnos", async (req, res) => {
  try {
    const profesorId = parseInt(req.params.profesorId, 10);
    if (isNaN(profesorId)) {
      res.status(400).json({ error: "ID de profesor inválido" });
      return;
    }

    const assignments = await db
      .select({
        alumnoId: profesorStudentsTable.alumnoId,
      })
      .from(profesorStudentsTable)
      .where(eq(profesorStudentsTable.profesorId, profesorId));

    res.json({ alumnoIds: assignments.map((a) => a.alumnoId) });
  } catch (error) {
    console.error("Admin get profesor alumnos error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/profesor/:profesorId/alumnos", async (req, res) => {
  try {
    const profesorId = parseInt(req.params.profesorId, 10);
    if (isNaN(profesorId)) {
      res.status(400).json({ error: "ID de profesor inválido" });
      return;
    }
    const { alumnoIds } = req.body;

    if (!Array.isArray(alumnoIds)) {
      res.status(400).json({ error: "Se requiere un array de alumnoIds" });
      return;
    }

    const [profesor] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, profesorId))
      .limit(1);

    if (!profesor) {
      res.status(404).json({ error: "Profesor no encontrado" });
      return;
    }

    const profesorRole = await db
      .select({ id: userRolesTable.id })
      .from(userRolesTable)
      .where(and(eq(userRolesTable.userId, profesorId), eq(userRolesTable.role, "profesor")))
      .limit(1);

    if (profesorRole.length === 0) {
      res.status(400).json({ error: "El usuario no tiene rol de profesor" });
      return;
    }

    await db.delete(profesorStudentsTable).where(eq(profesorStudentsTable.profesorId, profesorId));

    for (const alumnoId of alumnoIds) {
      const id = parseInt(alumnoId, 10);
      if (!isNaN(id)) {
        await db.insert(profesorStudentsTable).values({
          profesorId,
          alumnoId: id,
        });
      }
    }

    res.json({ success: true, alumnoIds: alumnoIds.map((id: number) => parseInt(String(id), 10)) });
  } catch (error) {
    console.error("Admin update profesor alumnos error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default adminRouter;
