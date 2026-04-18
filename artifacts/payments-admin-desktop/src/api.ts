// In dev mode, Vite proxy handles /api → production server
// In production/Tauri, set the full URL via localStorage
function getBaseUrl() {
  // If running through Vite dev server, use relative URLs (proxy handles it)
  if (import.meta.env.DEV) return "";
  return localStorage.getItem("api_url") || "https://shinobi-iga-ryu-production.up.railway.app";
}

export function getApiUrl() {
  return getBaseUrl() || "(proxy)";
}

export function setApiUrl(url: string) {
  localStorage.setItem("api_url", url.replace(/\/+$/, ""));
}

// Auth token: issued by the server on /auth/login and sent back via
// Authorization: Bearer <token>. We use a header (not cookies) because
// WebKit-based Tauri on macOS blocks cross-site cookies via ITP.
const TOKEN_KEY = "auth_token";
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setAuthToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const base = getBaseUrl();
  const headers: Record<string, string> = {};
  if (opts?.body) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}/api${path}`, {
    method: opts?.method || "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    // If the server rejects our token (expired/invalid), drop it so the
    // next startup cleanly shows the login screen instead of looping.
    if (res.status === 401 && token) setAuthToken(null);
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.json();
}

// --- Types ---

export interface AdminUser {
  id: number;
  displayName: string;
  nickname: string | null;
  email: string;
  membershipStatus: "activo" | "inactivo" | "pausado";
  membershipExpiresAt: string | null;
  lastPaymentAt: string | null;
  phone: string | null;
  roles: string[];
  subscriptionLevel?: string;
  isFighter?: boolean;
  sedes?: string[];
  parentId?: number | null;
  internalName?: string | null;
  createdAt?: string;
}

export type SubscriptionLevel = "basico" | "medio" | "avanzado" | "personalizado";
export const SUBSCRIPTION_LEVELS: SubscriptionLevel[] = ["basico", "medio", "avanzado", "personalizado"];
export const SUBSCRIPTION_LABELS: Record<string, string> = {
  basico: "Básico", medio: "Medium", avanzado: "Premium", personalizado: "Personalizado",
};

export type Sede = "bogota" | "chia";
export const SEDES: Sede[] = ["bogota", "chia"];
export const SEDE_LABELS: Record<string, string> = { bogota: "Bogotá", chia: "Chía" };

export type Role = "admin" | "profesor" | "alumno";
export const ROLES: Role[] = ["admin", "profesor", "alumno"];
export const ROLE_LABELS: Record<string, string> = { admin: "Admin", profesor: "Profesor", alumno: "Alumno" };

export interface Payment {
  id: number;
  userId: number;
  paymentDate: string;
  expiresDate: string;
  amount: number | null;
  paymentMethod: string;
  subscriptionLevel: string | null;
  notes: string | null;
  registeredBy: number;
  paidByUserId?: number | null;
  createdAt: string;
  userName?: string;
  userNickname?: string | null;
}

export type PaymentMethod = "nequi" | "daviplata" | "banco" | "link" | "tarjeta" | "efectivo";
export const PAYMENT_METHODS: PaymentMethod[] = ["nequi", "daviplata", "banco", "link", "tarjeta", "efectivo"];

export const METHOD_LABELS: Record<string, string> = {
  nequi: "Nequi",
  daviplata: "Daviplata",
  banco: "Banco",
  link: "Link",
  tarjeta: "Tarjeta",
  efectivo: "Efectivo",
};

// --- API calls ---

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await apiFetch<{ user: { id: number; roles: string[] }; token?: string }>(
      "/auth/login",
      { method: "POST", body: { email, password } }
    );
    if (res.token) setAuthToken(res.token);
    return res;
  },
  me: () =>
    apiFetch<{ user: { id: number; roles: string[] } }>("/auth/me"),
  logout: async () => {
    await apiFetch<void>("/auth/logout", { method: "POST" }).catch(() => {});
    setAuthToken(null);
  },
};

export const adminApi = {
  getUsers: () =>
    apiFetch<{ users: AdminUser[] }>("/admin/users"),
  getAllPayments: () =>
    apiFetch<{ payments: Payment[] }>("/admin/payments"),
  getUserPayments: (userId: number) =>
    apiFetch<{ payments: Payment[] }>(`/admin/users/${userId}/payments`),
  createPayment: (userId: number, data: { paymentDate: string; expiresDate: string; amount?: number; paymentMethod: string; subscriptionLevel?: string; notes?: string; paidByUserId?: number | null }) =>
    apiFetch<{ payment: Payment }>(`/admin/users/${userId}/payments`, { method: "POST", body: data }),
  updatePayment: (id: number, data: { paymentDate?: string; expiresDate?: string; amount?: number | null; paymentMethod?: string; subscriptionLevel?: string | null; notes?: string | null; paidByUserId?: number | null }) =>
    apiFetch<{ payment: Payment }>(`/admin/payments/${id}`, { method: "PUT", body: data }),
  deletePayment: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/payments/${id}`, { method: "DELETE" }),
  createUser: (data: { email?: string; displayName: string; nickname?: string | null; internalName?: string | null; password?: string; phone?: string; roles?: string[]; subscriptionLevel?: string; isFighter?: boolean; sedes?: string[]; parentId?: number | null }) =>
    apiFetch<{ user: AdminUser }>("/admin/users", { method: "POST", body: data }),
  updateUser: (id: number, data: { displayName?: string; nickname?: string | null; internalName?: string | null; email?: string; phone?: string; password?: string; isFighter?: boolean; sedes?: string[]; parentId?: number | null }) =>
    apiFetch<{ user: AdminUser }>(`/admin/users/${id}`, { method: "PUT", body: data }),
  updateUserRoles: (id: number, roles: string[]) =>
    apiFetch<{ user: AdminUser }>(`/admin/users/${id}/roles`, { method: "PUT", body: { roles } }),
  updateUserSubscription: (id: number, subscriptionLevel: string) =>
    apiFetch<{ user: AdminUser }>(`/admin/users/${id}/subscription`, { method: "PUT", body: { subscriptionLevel } }),
};
