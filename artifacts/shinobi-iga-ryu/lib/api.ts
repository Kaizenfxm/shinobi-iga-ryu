import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl(): string {
  if (Platform.OS === "web") {
    return "";
  }
  const devDomain = Constants.expoConfig?.extra?.EXPO_PUBLIC_DOMAIN
    ?? process.env.EXPO_PUBLIC_DOMAIN
    ?? "";
  if (devDomain) {
    return `https://${devDomain}`;
  }
  return "http://localhost:8080";
}

const BASE_URL = getBaseUrl();

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    const message = typeof data === "object" && data !== null && "error" in data
      ? (data as { error: string }).error
      : `HTTP ${status}`;
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  const fetchHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined) {
    fetchHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: fetchHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { error: response.statusText };
    }
    throw new ApiError(response.status, data);
  }

  return response.json() as Promise<T>;
}

export interface UserData {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  subscriptionLevel: string;
  roles: string[];
}

export interface AuthResponse {
  user: UserData;
}

export const authApi = {
  register: (data: { email: string; password: string; displayName: string }) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: data }),

  me: () => apiFetch<AuthResponse>("/auth/me"),

  logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

export const adminApi = {
  getUsers: () => apiFetch<{ users: UserData[] }>("/admin/users"),

  updateRoles: (userId: number, roles: string[]) =>
    apiFetch<{ success: boolean; roles: string[] }>(`/admin/users/${userId}/roles`, {
      method: "PUT",
      body: { roles },
    }),

  updateSubscription: (userId: number, subscriptionLevel: string) =>
    apiFetch<{ success: boolean; subscriptionLevel: string }>(
      `/admin/users/${userId}/subscription`,
      { method: "PUT", body: { subscriptionLevel } }
    ),
};

export const profesorApi = {
  getAlumnos: () => apiFetch<{ students: UserData[] }>("/profesor/alumnos"),
};
