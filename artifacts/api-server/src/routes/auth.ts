import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userRolesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const authRouter = Router();

const MEMBERSHIP_FIELDS = {
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
  membershipNotes: usersTable.membershipNotes,
};

const GRACE_DAYS = 5;
const GRACE_MS = GRACE_DAYS * 24 * 60 * 60 * 1000;

function isMembershipExpired(user: { membershipStatus: string; trialEndsAt: Date | null; membershipExpiresAt: Date | null }): boolean {
  if (user.membershipStatus !== "activo") return false;
  const now = new Date();
  if (user.membershipExpiresAt) {
    return user.membershipExpiresAt.getTime() + GRACE_MS <= now.getTime();
  }
  if (user.trialEndsAt) {
    return user.trialEndsAt.getTime() + GRACE_MS <= now.getTime();
  }
  return false;
}

authRouter.post("/auth/register", async (req, res) => {
  try {
    const { email, password, displayName, phone, sedes } = req.body;

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

    const validSedes = ["bogota", "chia"];
    const sedesArray = Array.isArray(sedes)
      ? sedes.filter((s: string) => validSedes.includes(s))
      : [];

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 3);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName.trim(),
        phone: phone?.trim() || null,
        sedes: sedesArray,
        membershipStatus: "activo",
        trialEndsAt,
      })
      .returning(MEMBERSHIP_FIELDS);

    await db.insert(userRolesTable).values({
      userId: user.id,
      role: "alumno",
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

    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, user.id));

    const roleNames = roles.map((r) => r.role);
    const isPrivileged = roleNames.includes("admin") || roleNames.includes("profesor");

    if (!isPrivileged && isMembershipExpired(user)) {
      await db.transaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ membershipStatus: "inactivo", updatedAt: new Date() })
          .where(and(eq(usersTable.id, user.id), eq(usersTable.membershipStatus, "activo")));
      });
      user.membershipStatus = "inactivo";
    }

    req.session.userId = user.id;

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        subscriptionLevel: user.subscriptionLevel,
        phone: user.phone,
        isFighter: user.isFighter,
        sedes: user.sedes,
        membershipStatus: user.membershipStatus,
        membershipExpiresAt: user.membershipExpiresAt,
        trialEndsAt: user.trialEndsAt,
        lastPaymentAt: user.lastPaymentAt,
        membershipNotes: user.membershipNotes,
        roles: roleNames,
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
      .select(MEMBERSHIP_FIELDS)
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
