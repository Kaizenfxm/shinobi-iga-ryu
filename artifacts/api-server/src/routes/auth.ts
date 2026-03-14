import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userRolesTable, beltDefinitionsTable, studentBeltsTable, beltHistoryTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: "Email, contraseña y nombre son requeridos" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Este email ya está registrado" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName.trim(),
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        isFighter: usersTable.isFighter,
      });

    await db.insert(userRolesTable).values({
      userId: user.id,
      role: "alumno",
    });

    const disciplines = ["ninjutsu", "jiujitsu"] as const;
    await db.transaction(async (tx) => {
      for (const discipline of disciplines) {
        const [whiteBelt] = await tx
          .select()
          .from(beltDefinitionsTable)
          .where(
            and(
              eq(beltDefinitionsTable.discipline, discipline),
              eq(beltDefinitionsTable.orderIndex, 0)
            )
          )
          .limit(1);

        if (whiteBelt) {
          await tx.insert(studentBeltsTable).values({
            userId: user.id,
            discipline,
            currentBeltId: whiteBelt.id,
            nextUnlocked: false,
          });

          await tx.insert(beltHistoryTable).values({
            userId: user.id,
            discipline,
            beltId: whiteBelt.id,
            notes: "Cinturón inicial asignado al registro",
          });
        }
      }
    });

    req.session.userId = user.id;

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, user.id));

    res.status(201).json({
      user: {
        ...user,
        roles: roles.map((r) => r.role),
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

authRouter.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    req.session.userId = user.id;

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, user.id));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        subscriptionLevel: user.subscriptionLevel,
        isFighter: user.isFighter,
        roles: roles.map((r) => r.role),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        isFighter: usersTable.isFighter,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);

    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Usuario no encontrado" });
      return;
    }

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, user.id));

    res.json({
      user: {
        ...user,
        roles: roles.map((r) => r.role),
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

authRouter.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Error al cerrar sesión" });
      return;
    }
    res.clearCookie("sid");
    res.json({ success: true });
  });
});

export default authRouter;
