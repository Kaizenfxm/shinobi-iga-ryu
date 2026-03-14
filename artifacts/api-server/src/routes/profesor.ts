import { Router } from "express";
import { db, usersTable, userRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireProfesor } from "../middlewares/auth";

const profesorRouter = Router();

profesorRouter.use(requireProfesor);

profesorRouter.get("/profesor/alumnos", async (_req, res) => {
  try {
    const alumnoRoles = await db
      .select({
        userId: userRolesTable.userId,
      })
      .from(userRolesTable)
      .where(eq(userRolesTable.role, "alumno"));

    const alumnoIds = alumnoRoles.map((r) => r.userId);

    if (alumnoIds.length === 0) {
      res.json({ students: [] });
      return;
    }

    const { inArray } = await import("drizzle-orm");

    const students = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
      })
      .from(usersTable)
      .where(inArray(usersTable.id, alumnoIds));

    const allRoles = await db
      .select({
        userId: userRolesTable.userId,
        role: userRolesTable.role,
      })
      .from(userRolesTable)
      .where(inArray(userRolesTable.userId, alumnoIds));

    const rolesByUser = new Map<number, string[]>();
    for (const r of allRoles) {
      const existing = rolesByUser.get(r.userId) || [];
      existing.push(r.role);
      rolesByUser.set(r.userId, existing);
    }

    const studentsWithRoles = students.map((s) => ({
      ...s,
      roles: rolesByUser.get(s.id) || [],
    }));

    res.json({ students: studentsWithRoles });
  } catch (error) {
    console.error("Profesor get alumnos error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default profesorRouter;
