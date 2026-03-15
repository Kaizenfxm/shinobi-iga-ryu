import type { Request, Response, NextFunction } from "express";
import { db, usersTable, userRolesTable, paymentHistoryTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const GRACE_DAYS = 5;

export async function getEffectiveMembershipExpiry(userId: number): Promise<Date | null> {
  const [latest] = await db
    .select({ expiresDate: paymentHistoryTable.expiresDate })
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.userId, userId))
    .orderBy(desc(paymentHistoryTable.expiresDate))
    .limit(1);
  return latest ? new Date(latest.expiresDate + "T23:59:59Z") : null;
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const [user] = await db
    .select({ membershipStatus: usersTable.membershipStatus })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  if (user.membershipStatus !== "activo") {
    const roles = await db
      .select({ role: userRolesTable.role })
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, req.session.userId));

    const roleNames = roles.map((r) => r.role);
    const isPrivileged = roleNames.includes("admin") || roleNames.includes("profesor");

    if (!isPrivileged) {
      res.status(403).json({ error: "membership_inactive", membershipStatus: user.membershipStatus });
      return;
    }
  }

  next();
}

type RoleName = "admin" | "profesor" | "alumno";

async function checkRole(req: Request, res: Response, next: NextFunction, role: RoleName) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const found = await db
    .select()
    .from(userRolesTable)
    .where(
      and(
        eq(userRolesTable.userId, req.session.userId),
        eq(userRolesTable.role, role)
      )
    )
    .limit(1);

  if (found.length === 0) {
    res.status(403).json({ error: `Se requiere rol de ${role}` });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return checkRole(req, res, next, "admin");
}

export function requireProfesor(req: Request, res: Response, next: NextFunction) {
  return checkRole(req, res, next, "profesor");
}
