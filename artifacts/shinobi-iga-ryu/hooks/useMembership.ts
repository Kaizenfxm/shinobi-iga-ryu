import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface MembershipInfo {
  status: "activo" | "inactivo" | "pausado" | null;
  daysRemaining: number | null;
  expiresAt: Date | null;
  isBlocked: boolean;
  isAlumno: boolean;
  showCountdown: boolean;
}

export function useMembership(): MembershipInfo {
  const { user, hasRole } = useAuth();

  return useMemo(() => {
    if (!user) {
      return { status: null, daysRemaining: null, expiresAt: null, isBlocked: false, isAlumno: false, showCountdown: false };
    }

    const isAdmin = hasRole("admin");
    const isProfesor = hasRole("profesor");
    const isPrivileged = isAdmin || isProfesor;
    const isAlumno = hasRole("alumno");

    const status = user.membershipStatus ?? "activo";

    if (isPrivileged) {
      return { status, daysRemaining: null, expiresAt: null, isBlocked: false, isAlumno, showCountdown: false };
    }

    const now = Date.now();

    // membershipExpiresAt (admin-assigned) takes priority over trialEndsAt (3-day trial).
    // trialEndsAt is only a fallback when no real membership has been set yet.
    const expiresAt: Date | null = user.membershipExpiresAt
      ? new Date(user.membershipExpiresAt)
      : user.trialEndsAt
        ? new Date(user.trialEndsAt)
        : null;

    let daysRemaining: number | null = null;
    if (expiresAt) {
      const diff = expiresAt.getTime() - now;
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) daysRemaining = 0;
    }

    const isBlocked = status === "inactivo" || status === "pausado";
    const showCountdown = !isBlocked && daysRemaining !== null && daysRemaining <= 7 && isAlumno;

    return { status, daysRemaining, expiresAt, isBlocked, isAlumno, showCountdown };
  }, [user, hasRole]);
}
