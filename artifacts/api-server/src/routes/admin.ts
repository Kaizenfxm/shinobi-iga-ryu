import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userRolesTable, profesorStudentsTable, studentBeltsTable, beltHistoryTable, studentBeltUnlocksTable, fightsTable, beltDefinitionsTable, beltApplicationsTable, studentRequirementChecksTable, appSettingsTable, paymentHistoryTable } from "@workspace/db";
import { eq, and, or, desc, isNotNull, isNull, lte, notInArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const adminRouter = Router();

const MEMBERSHIP_GRACE_DAYS = 5;

async function runMembershipExpiryCheck() {
  const graceCutoff = new Date(Date.now() - MEMBERSHIP_GRACE_DAYS * 24 * 60 * 60 * 1000);

  const privilegedRows = await db
    .select({ userId: userRolesTable.userId })
    .from(userRolesTable)
    .where(or(eq(userRolesTable.role, "admin"), eq(userRolesTable.role, "profesor")));
  const privilegedIds = privilegedRows.map((r) => r.userId);

  const baseCondition = and(
    eq(usersTable.membershipStatus, "activo"),
    ...(privilegedIds.length > 0 ? [notInArray(usersTable.id, privilegedIds)] : [])
  );

  await db
    .update(usersTable)
    .set({ membershipStatus: "inactivo" })
    .where(and(baseCondition, isNotNull(usersTable.membershipExpiresAt), lte(usersTable.membershipExpiresAt, graceCutoff)));

  await db
    .update(usersTable)
    .set({ membershipStatus: "inactivo" })
    .where(and(baseCondition, isNull(usersTable.membershipExpiresAt), isNotNull(usersTable.trialEndsAt), lte(usersTable.trialEndsAt, graceCutoff)));
}

async function fetchUsersWithRoles() {
  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      subscriptionLevel: usersTable.subscriptionLevel,
      isFighter: usersTable.isFighter,
      phone: usersTable.phone,
      sedes: usersTable.sedes,
      membershipStatus: usersTable.membershipStatus,
      membershipExpiresAt: usersTable.membershipExpiresAt,
      trialEndsAt: usersTable.trialEndsAt,
      lastPaymentAt: usersTable.lastPaymentAt,
      membershipNotes: usersTable.membershipNotes,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  const allRoles = await db
    .select({ userId: userRolesTable.userId, role: userRolesTable.role })
    .from(userRolesTable);

  const rolesByUser = new Map<number, string[]>();
  for (const r of allRoles) {
    const existing = rolesByUser.get(r.userId) || [];
    existing.push(r.role);
    rolesByUser.set(r.userId, existing);
  }

  return users.map((u) => ({ ...u, roles: rolesByUser.get(u.id) || [] }));
}

adminRouter.get("/admin/users", requireAdmin, async (_req, res) => {
  try {
    await runMembershipExpiryCheck();
    const users = await fetchUsersWithRoles();
    res.json({ users });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.post("/admin/users", requireAdmin, async (req, res) => {
  try {
    const { email, displayName, phone, roles, subscriptionLevel, isFighter, sedes } = req.body;
    const password = req.body.password || "Ninja123";

    if (!email || !displayName) {
      res.status(400).json({ error: "Email y nombre son obligatorios" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const validLevels = ["basico", "medio", "avanzado", "personalizado"] as const;
    const subLevel: typeof validLevels[number] = validLevels.includes(subscriptionLevel) ? subscriptionLevel : "basico";
    const validRoles = ["admin", "profesor", "alumno"] as const;
    const userRoles: typeof validRoles[number][] = Array.isArray(roles)
      ? roles.filter((r: string) => validRoles.includes(r as typeof validRoles[number])) as typeof validRoles[number][]
      : ["alumno"];
    if (userRoles.length === 0) userRoles.push("alumno");

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Ya existe un usuario con ese email" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const validSedes = ["bogota", "chia"];
    const sedesArray = Array.isArray(sedes)
      ? sedes.filter((s: string) => validSedes.includes(s))
      : [];

    const isPrivileged = userRoles.includes("admin") || userRoles.includes("profesor");
    const trialEndsAt = isPrivileged ? null : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        displayName: displayName.trim(),
        phone: phone?.trim() || null,
        subscriptionLevel: subLevel,
        isFighter: isFighter === true,
        sedes: sedesArray,
        membershipStatus: "activo",
        trialEndsAt,
      })
      .returning({
        id: usersTable.id,
        email: usersTable.email,
        displayName: usersTable.displayName,
        avatarUrl: usersTable.avatarUrl,
        subscriptionLevel: usersTable.subscriptionLevel,
        isFighter: usersTable.isFighter,
        phone: usersTable.phone,
        sedes: usersTable.sedes,
        membershipStatus: usersTable.membershipStatus,
        membershipExpiresAt: usersTable.membershipExpiresAt,
        trialEndsAt: usersTable.trialEndsAt,
        lastPaymentAt: usersTable.lastPaymentAt,
        membershipNotes: usersTable.membershipNotes,
      });

    for (const role of userRoles) {
      await db.insert(userRolesTable).values({ userId: newUser.id, role });
    }

    const disciplines = ["ninjutsu", "jiujitsu"] as const;
    for (const discipline of disciplines) {
      const [whiteBelt] = await db
        .select({ id: beltDefinitionsTable.id })
        .from(beltDefinitionsTable)
        .where(and(eq(beltDefinitionsTable.discipline, discipline), eq(beltDefinitionsTable.orderIndex, 0)))
        .limit(1);

      if (whiteBelt) {
        await db.insert(studentBeltsTable).values({
          userId: newUser.id,
          discipline,
          currentBeltId: whiteBelt.id,
          nextUnlocked: false,
        }).onConflictDoNothing();

        await db.insert(beltHistoryTable).values({
          userId: newUser.id,
          discipline,
          beltId: whiteBelt.id,
          notes: "Cinturón inicial asignado por administrador",
        });
      }
    }

    res.status(201).json({ user: { ...newUser, roles: userRoles } });
  } catch (error) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const { displayName, email, phone, isFighter, password, sedes } = req.body;

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const updates: Partial<typeof usersTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    const validSedes = ["bogota", "chia"];
    if (displayName !== undefined && displayName.trim()) updates.displayName = displayName.trim();
    if (email !== undefined && email.trim()) updates.email = email.toLowerCase().trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (isFighter !== undefined) updates.isFighter = Boolean(isFighter);
    if (Array.isArray(sedes)) updates.sedes = sedes.filter((s: string) => validSedes.includes(s));
    if (password !== undefined && password.length >= 6) {
      updates.passwordHash = await bcrypt.hash(password, 12);
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
        isFighter: usersTable.isFighter,
        phone: usersTable.phone,
        sedes: usersTable.sedes,
        membershipStatus: usersTable.membershipStatus,
        membershipExpiresAt: usersTable.membershipExpiresAt,
        trialEndsAt: usersTable.trialEndsAt,
        lastPaymentAt: usersTable.lastPaymentAt,
        membershipNotes: usersTable.membershipNotes,
      });

    res.json({ user: updated });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const adminId = req.session?.userId;
    if (adminId === userId) {
      res.status(400).json({ error: "No puedes eliminarte a ti mismo" });
      return;
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(studentRequirementChecksTable).where(eq(studentRequirementChecksTable.userId, userId));
      await tx.delete(beltApplicationsTable).where(eq(beltApplicationsTable.userId, userId));
      await tx.delete(studentBeltUnlocksTable).where(
        or(eq(studentBeltUnlocksTable.userId, userId), eq(studentBeltUnlocksTable.unlockedBy, userId))
      );
      await tx.delete(beltHistoryTable).where(eq(beltHistoryTable.userId, userId));
      await tx.delete(studentBeltsTable).where(eq(studentBeltsTable.userId, userId));
      await tx.delete(fightsTable).where(eq(fightsTable.userId, userId));
      await tx.delete(profesorStudentsTable).where(
        or(eq(profesorStudentsTable.profesorId, userId), eq(profesorStudentsTable.alumnoId, userId))
      );
      await tx.delete(userRolesTable).where(eq(userRolesTable.userId, userId));
      await tx.delete(usersTable).where(eq(usersTable.id, userId));
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/users/:id/roles", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
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

adminRouter.put("/admin/users/:id/subscription", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
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
      .set({ subscriptionLevel: subscriptionLevel as typeof validLevels[number], updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning({ id: usersTable.id, subscriptionLevel: usersTable.subscriptionLevel });

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

adminRouter.put("/admin/users/:id/membership", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const { status, membershipExpiresAt, notes } = req.body;
    const validStatuses = ["activo", "inactivo", "pausado"] as const;

    const updates: Partial<typeof usersTable.$inferInsert> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (status !== undefined) {
      if (!validStatuses.includes(status as typeof validStatuses[number])) {
        res.status(400).json({ error: "Estado de membresía inválido" });
        return;
      }
      updates.membershipStatus = status as typeof validStatuses[number];
    }

    if (membershipExpiresAt !== undefined) {
      updates.membershipExpiresAt = membershipExpiresAt ? new Date(membershipExpiresAt) : null;
    }

    if (notes !== undefined) {
      updates.membershipNotes = notes?.trim() || null;
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        membershipStatus: usersTable.membershipStatus,
        membershipExpiresAt: usersTable.membershipExpiresAt,
        membershipNotes: usersTable.membershipNotes,
      });

    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ success: true, ...updated });
  } catch (error) {
    console.error("Admin update membership error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/users/:id/payment", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const { membershipExpiresAt, lastPaymentAt } = req.body;
    if (!membershipExpiresAt) {
      res.status(400).json({ error: "Se requiere la fecha de vencimiento" });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({
        membershipStatus: "activo",
        membershipExpiresAt: new Date(membershipExpiresAt),
        lastPaymentAt: lastPaymentAt ? new Date(lastPaymentAt) : new Date(),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        membershipStatus: usersTable.membershipStatus,
        membershipExpiresAt: usersTable.membershipExpiresAt,
        lastPaymentAt: usersTable.lastPaymentAt,
      });

    if (!updated) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    res.json({ success: true, ...updated });
  } catch (error) {
    console.error("Admin register payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.get("/admin/settings", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(appSettingsTable);
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json({ settings });
  } catch (error) {
    console.error("Admin get settings error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/settings", requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body as { settings?: Record<string, string> };
    if (!settings || typeof settings !== "object") {
      res.status(400).json({ error: "Se requiere un objeto settings" });
      return;
    }

    const allowedKeys = ["whatsapp_admin_number", "payment_link_url", "bogota_video_url", "chia_video_url", "bogota_address", "chia_address"];
    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(settings)) {
        if (!allowedKeys.includes(key)) continue;
        await tx
          .insert(appSettingsTable)
          .values({ key, value: String(value).trim(), updatedAt: new Date() })
          .onConflictDoUpdate({
            target: appSettingsTable.key,
            set: { value: String(value).trim(), updatedAt: new Date() },
          });
      }
    });

    const rows = await db.select().from(appSettingsTable);
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    res.json({ settings: result });
  } catch (error) {
    console.error("Admin update settings error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.get("/admin/profesor/:profesorId/alumnos", requireAdmin, async (req, res) => {
  try {
    const profesorId = parseInt(String(req.params.profesorId), 10);
    if (isNaN(profesorId)) {
      res.status(400).json({ error: "ID de profesor inválido" });
      return;
    }

    const assignments = await db
      .select({ alumnoId: profesorStudentsTable.alumnoId })
      .from(profesorStudentsTable)
      .where(eq(profesorStudentsTable.profesorId, profesorId));

    res.json({ alumnoIds: assignments.map((a) => a.alumnoId) });
  } catch (error) {
    console.error("Admin get profesor alumnos error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/profesor/:profesorId/alumnos", requireAdmin, async (req, res) => {
  try {
    const profesorId = parseInt(String(req.params.profesorId), 10);
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
        await db.insert(profesorStudentsTable).values({ profesorId, alumnoId: id });
      }
    }

    res.json({ success: true, alumnoIds: alumnoIds.map((id: number) => parseInt(String(id), 10)) });
  } catch (error) {
    console.error("Admin update profesor alumnos error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

type DbOrTx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

async function recalculateUserMembership(userId: number, tx: DbOrTx = db) {
  const payments = await tx
    .select({
      paymentDate: paymentHistoryTable.paymentDate,
      expiresDate: paymentHistoryTable.expiresDate,
    })
    .from(paymentHistoryTable)
    .where(eq(paymentHistoryTable.userId, userId))
    .orderBy(desc(paymentHistoryTable.expiresDate));

  if (payments.length === 0) {
    await tx
      .update(usersTable)
      .set({ membershipExpiresAt: null, lastPaymentAt: null })
      .where(eq(usersTable.id, userId));
    return;
  }

  const latestExpiry = payments[0].expiresDate;
  const latestPaymentDate = payments.reduce((best, p) =>
    p.paymentDate > best ? p.paymentDate : best, payments[0].paymentDate
  );

  await tx
    .update(usersTable)
    .set({
      membershipExpiresAt: new Date(latestExpiry + "T23:59:59Z"),
      lastPaymentAt: new Date(latestPaymentDate + "T12:00:00Z"),
      membershipStatus: "activo",
    })
    .where(eq(usersTable.id, userId));
}

adminRouter.get("/admin/users/:id/payments", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const payments = await db
      .select({
        id: paymentHistoryTable.id,
        userId: paymentHistoryTable.userId,
        paymentDate: paymentHistoryTable.paymentDate,
        expiresDate: paymentHistoryTable.expiresDate,
        amount: paymentHistoryTable.amount,
        paymentMethod: paymentHistoryTable.paymentMethod,
        notes: paymentHistoryTable.notes,
        registeredBy: paymentHistoryTable.registeredBy,
        createdAt: paymentHistoryTable.createdAt,
      })
      .from(paymentHistoryTable)
      .where(eq(paymentHistoryTable.userId, userId))
      .orderBy(desc(paymentHistoryTable.paymentDate));

    res.json({ payments });
  } catch (error) {
    console.error("Admin get payments error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.post("/admin/users/:id/payments", requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(String(req.params.id), 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: "ID de usuario inválido" });
      return;
    }

    const { paymentDate, expiresDate, amount, paymentMethod, notes } = req.body;

    if (!paymentDate || !expiresDate || !paymentMethod) {
      res.status(400).json({ error: "Se requieren paymentDate, expiresDate y paymentMethod" });
      return;
    }

    const validMethods = ["nequi", "daviplata", "banco", "link", "tarjeta"];
    if (!validMethods.includes(paymentMethod)) {
      res.status(400).json({ error: "Método de pago inválido" });
      return;
    }

    let newPayment: typeof paymentHistoryTable.$inferSelect | undefined;
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(paymentHistoryTable)
        .values({
          userId,
          paymentDate,
          expiresDate,
          amount: amount ? parseInt(String(amount), 10) : null,
          paymentMethod,
          notes: notes || null,
          registeredBy: req.session.userId!,
        })
        .returning();
      newPayment = inserted;
      await recalculateUserMembership(userId, tx);
    });

    res.json({ payment: newPayment });
  } catch (error) {
    console.error("Admin create payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.put("/admin/payments/:id", requireAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(String(req.params.id), 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "ID de pago inválido" });
      return;
    }

    const [existing] = await db
      .select({ id: paymentHistoryTable.id, userId: paymentHistoryTable.userId })
      .from(paymentHistoryTable)
      .where(eq(paymentHistoryTable.id, paymentId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    const { paymentDate, expiresDate, amount, paymentMethod, notes } = req.body;

    const validMethods = ["nequi", "daviplata", "banco", "link", "tarjeta"];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      res.status(400).json({ error: "Método de pago inválido" });
      return;
    }

    let updated: typeof paymentHistoryTable.$inferSelect | undefined;
    await db.transaction(async (tx) => {
      const [result] = await tx
        .update(paymentHistoryTable)
        .set({
          ...(paymentDate !== undefined && { paymentDate }),
          ...(expiresDate !== undefined && { expiresDate }),
          ...(amount !== undefined && { amount: amount ? parseInt(String(amount), 10) : null }),
          ...(paymentMethod !== undefined && { paymentMethod }),
          ...(notes !== undefined && { notes: notes || null }),
          updatedAt: new Date(),
        })
        .where(eq(paymentHistoryTable.id, paymentId))
        .returning();
      updated = result;
      await recalculateUserMembership(existing.userId, tx);
    });

    res.json({ payment: updated });
  } catch (error) {
    console.error("Admin update payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

adminRouter.delete("/admin/payments/:id", requireAdmin, async (req, res) => {
  try {
    const paymentId = parseInt(String(req.params.id), 10);
    if (isNaN(paymentId)) {
      res.status(400).json({ error: "ID de pago inválido" });
      return;
    }

    const [existing] = await db
      .select({ id: paymentHistoryTable.id, userId: paymentHistoryTable.userId })
      .from(paymentHistoryTable)
      .where(eq(paymentHistoryTable.id, paymentId))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(paymentHistoryTable).where(eq(paymentHistoryTable.id, paymentId));
      await recalculateUserMembership(existing.userId, tx);
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Admin delete payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default adminRouter;
