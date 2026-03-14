import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  next();
}

type RoleName = "admin" | "profesor" | "alumno";

async function checkRole(req: Request, res: Response, next: NextFunction, role: RoleName) {
  if (!req.session.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const { db, userRolesTable } = await import("@workspace/db");
  const { eq, and } = await import("drizzle-orm");

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
