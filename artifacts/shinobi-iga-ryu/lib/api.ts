import { Platform } from "react-native";
import Constants from "expo-constants";

function getBaseUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes(".expo.riker.replit.dev")) {
      return `https://${hostname.replace(".expo.riker.replit.dev", ".riker.replit.dev")}`;
    }
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

export function getAvatarServingUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("/objects/")) {
    return `${getBaseUrl()}/api/storage${avatarUrl}`;
  }
  return avatarUrl;
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
  nickname: string | null;
  avatarUrl: string | null;
  subscriptionLevel: string;
  phone: string | null;
  isFighter: boolean;
  hiddenFromCommunity: boolean;
  sedes: string[];
  roles: string[];
  membershipStatus: "activo" | "inactivo" | "pausado";
  membershipExpiresAt: string | null;
  membershipPausedAt: string | null;
  trialEndsAt: string | null;
  lastPaymentAt: string | null;
  membershipNotes: string | null;
  parentId: number | null;
  internalName: string | null;
  createdAt: string;
}

export type PaymentMethod = "nequi" | "daviplata" | "banco" | "link" | "tarjeta" | "efectivo";

export interface PaymentRecord {
  id: number;
  userId: number;
  paymentDate: string;
  expiresDate: string;
  amount: number | null;
  paymentMethod: PaymentMethod;
  subscriptionLevel: string | null;
  notes: string | null;
  registeredBy: number;
  paidByUserId?: number | null;
  createdAt: string;
}

export interface AuthResponse {
  user: UserData;
}

export const authApi = {
  register: (data: { email: string; password: string; displayName: string; phone?: string; sedes?: string[] }) =>
    apiFetch<AuthResponse>("/auth/register", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>("/auth/login", { method: "POST", body: data }),

  me: () => apiFetch<AuthResponse>("/auth/me"),

  logout: () => apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" }),
};

export const adminApi = {
  getUsers: () => apiFetch<{ users: UserData[] }>("/admin/users"),

  createUser: (data: {
    email?: string;
    password?: string;
    displayName: string;
    nickname?: string | null;
    internalName?: string | null;
    phone?: string;
    roles?: string[];
    subscriptionLevel?: string;
    isFighter?: boolean;
    sedes?: string[];
    parentId?: number | null;
  }) => apiFetch<{ user: UserData & { roles: string[] } }>("/admin/users", { method: "POST", body: data }),

  updateUser: (userId: number, data: {
    displayName?: string;
    nickname?: string | null;
    internalName?: string | null;
    email?: string;
    phone?: string;
    isFighter?: boolean;
    password?: string;
    sedes?: string[];
    parentId?: number | null;
  }) => apiFetch<{ user: UserData }>(`/admin/users/${userId}`, { method: "PUT", body: data }),

  deleteUser: (userId: number) =>
    apiFetch<{ success: boolean }>(`/admin/users/${userId}`, { method: "DELETE" }),

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

  updateMembership: (userId: number, data: { status?: string; membershipExpiresAt?: string | null; notes?: string | null; pausedAt?: string; resumeAt?: string }) =>
    apiFetch<{ success: boolean; id: number; membershipStatus: string; membershipExpiresAt: string | null; membershipPausedAt: string | null; membershipNotes: string | null }>(
      `/admin/users/${userId}/membership`,
      { method: "PUT", body: data }
    ),

  getPaymentHistory: (userId: number) =>
    apiFetch<{ payments: PaymentRecord[] }>(`/admin/users/${userId}/payments`),

  createPayment: (userId: number, data: {
    paymentDate: string;
    expiresDate: string;
    amount?: number | null;
    paymentMethod: PaymentMethod;
    subscriptionLevel?: string | null;
    notes?: string | null;
    paidByUserId?: number | null;
  }) =>
    apiFetch<{ payment: PaymentRecord }>(`/admin/users/${userId}/payments`, { method: "POST", body: data }),

  updatePayment: (paymentId: number, data: {
    paymentDate?: string;
    expiresDate?: string;
    amount?: number | null;
    paymentMethod?: PaymentMethod;
    subscriptionLevel?: string | null;
    notes?: string | null;
    paidByUserId?: number | null;
  }) =>
    apiFetch<{ payment: PaymentRecord }>(`/admin/payments/${paymentId}`, { method: "PUT", body: data }),

  deletePayment: (paymentId: number) =>
    apiFetch<{ success: boolean }>(`/admin/payments/${paymentId}`, { method: "DELETE" }),

  getSettings: () =>
    apiFetch<{ settings: Record<string, string> }>("/admin/settings"),

  updateSettings: (settings: Record<string, string>) =>
    apiFetch<{ settings: Record<string, string> }>("/admin/settings", { method: "PUT", body: { settings } }),

  getAnthropometry: (userId: number) =>
    apiFetch<{ anthropometry: WeightData | null }>(`/admin/users/${userId}/anthropometry`),

  updateAnthropometry: (userId: number, data: { initialWeight?: number | null; targetWeight?: number | null }) =>
    apiFetch<{ success: boolean; anthropometry: WeightData }>(`/admin/users/${userId}/anthropometry`, {
      method: "PUT",
      body: data,
    }),
};

export const profesorApi = {
  getAlumnos: () => apiFetch<{ students: UserData[] }>("/profesor/alumnos"),
};

export const settingsApi = {
  getPublic: () =>
    apiFetch<{
      whatsappAdminNumber: string;
      paymentLinkUrl: string;
      bogotaVideoUrl: string;
      chiaVideoUrl: string;
      bogotaAddress: string;
      chiaAddress: string;
      privacyPolicyUrl: string;
    }>("/settings/public"),
};

export interface BeltDefinition {
  id: number;
  discipline: string;
  name: string;
  color: string;
  orderIndex: number;
  description: string | null;
}

export interface BeltRequirement {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
}

export interface BeltExam {
  id: number;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  passingScore: number | null;
}

export interface LadderBeltRequirement {
  id: number;
  title: string;
  description: string | null;
  orderIndex: number;
  checked: boolean;
}

export interface LadderBelt {
  id: number;
  name: string;
  color: string;
  orderIndex: number;
  description: string | null;
  status: "earned" | "current" | "available" | "applied" | "locked";
  requirements: LadderBeltRequirement[];
}

export interface MyBelt {
  discipline: string;
  currentBelt: BeltDefinition | null;
  nextUnlocked: boolean;
  unlockedAt: string | null;
  applied: boolean;
  ladder: LadderBelt[];
  nextBelt: BeltDefinition | null;
  nextRequirements: BeltRequirement[];
  nextExam: BeltExam | null;
}

export interface BeltHistoryItem {
  id: number;
  discipline: string;
  beltId: number;
  achievedAt: string;
  notes: string | null;
  beltName: string;
  beltColor: string;
}

export interface AdminBeltUser {
  id: number;
  displayName: string;
  email: string;
  roles: string[];
  belts: {
    discipline: string;
    currentBelt: {
      id: number;
      name: string;
      color: string;
      orderIndex: number;
    };
    nextUnlocked: boolean;
  }[];
}

export interface PendingBeltApplication {
  id: number;
  userId: number;
  userDisplayName: string;
  userEmail: string;
  userAvatarUrl: string | null;
  discipline: string;
  targetBeltId: number;
  targetBeltName: string;
  targetBeltColor: string;
  appliedAt: string;
}

export interface CatalogRequirement {
  id: number;
  beltId: number;
  title: string;
  description: string | null;
  orderIndex: number;
}

export interface CatalogBelt {
  id: number;
  discipline: string;
  name: string;
  color: string;
  orderIndex: number;
  description: string | null;
  requirements: CatalogRequirement[];
}

export interface CatalogDiscipline {
  discipline: string;
  belts: CatalogBelt[];
}

export const beltsApi = {
  getMyBelts: () => apiFetch<{ belts: MyBelt[]; history: BeltHistoryItem[] }>("/belts/me"),

  apply: (discipline: string) =>
    apiFetch<{ success: boolean; alreadyApplied: boolean }>("/belts/apply", {
      method: "POST",
      body: { discipline },
    }),

  toggleRequirementCheck: (requirementId: number) =>
    apiFetch<{ checked: boolean }>(`/belts/requirements/${requirementId}/toggle`, {
      method: "POST",
    }),

  getDefinitions: () => apiFetch<{ definitions: BeltDefinition[] }>("/belts/definitions"),

  adminGetUsers: () => apiFetch<{ users: AdminBeltUser[] }>("/admin/belts/users"),

  adminGetPendingApplications: () =>
    apiFetch<{ applications: PendingBeltApplication[] }>("/admin/belts/applications/pending"),

  adminActOnApplication: (id: number, action: "approve" | "reject") =>
    apiFetch<{ success: boolean; action: string }>(`/admin/belts/applications/${id}`, {
      method: "PUT",
      body: { action },
    }),

  adminGetHistory: (userId: number) =>
    apiFetch<{ history: BeltHistoryItem[] }>(`/admin/belts/users/${userId}/history`),

  adminUnlock: (userId: number, discipline: string) =>
    apiFetch<{ success: boolean; nextBelt: BeltDefinition }>("/admin/belts/unlock", {
      method: "POST",
      body: { userId, discipline },
    }),

  adminPromote: (userId: number, discipline: string) =>
    apiFetch<{ success: boolean; newBelt: BeltDefinition }>("/admin/belts/promote", {
      method: "POST",
      body: { userId, discipline },
    }),

  adminInitialize: (userId: number) =>
    apiFetch<{ success: boolean; initialized: string[] }>("/admin/belts/initialize", {
      method: "POST",
      body: { userId },
    }),

  adminGetUnlocks: (userId: number) =>
    apiFetch<{ unlocks: UnlockRecord[] }>(`/admin/belts/unlocks/${userId}`),

  adminGetCatalog: () =>
    apiFetch<{ catalog: CatalogDiscipline[] }>("/admin/belts/catalog"),

  adminCreateBelt: (data: { discipline: string; name: string; color: string; description?: string }) =>
    apiFetch<{ belt: CatalogBelt }>("/admin/belts/definitions", { method: "POST", body: data }),

  adminUpdateBelt: (id: number, data: { name?: string; color?: string; description?: string | null }) =>
    apiFetch<{ belt: CatalogBelt }>(`/admin/belts/definitions/${id}`, { method: "PUT", body: data }),

  adminDeleteBelt: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/belts/definitions/${id}`, { method: "DELETE" }),

  adminReorderBelts: (discipline: string, order: { id: number; orderIndex: number }[]) =>
    apiFetch<{ success: boolean }>("/admin/belts/definitions/reorder", { method: "PUT", body: { discipline, order } }),

  adminCreateRequirement: (beltId: number, data: { title: string; description?: string }) =>
    apiFetch<{ requirement: CatalogRequirement }>(`/admin/belts/definitions/${beltId}/requirements`, { method: "POST", body: data }),

  adminUpdateRequirement: (beltId: number, reqId: number, data: { title?: string; description?: string | null }) =>
    apiFetch<{ requirement: CatalogRequirement }>(`/admin/belts/definitions/${beltId}/requirements/${reqId}`, { method: "PUT", body: data }),

  adminDeleteRequirement: (beltId: number, reqId: number) =>
    apiFetch<{ success: boolean }>(`/admin/belts/definitions/${beltId}/requirements/${reqId}`, { method: "DELETE" }),

  adminAssignBelt: (userId: number, discipline: string, beltDefinitionId: number, notes?: string) =>
    apiFetch<{ success: boolean }>("/admin/belts/assign", {
      method: "POST",
      body: { userId, discipline, beltDefinitionId, notes },
    }),
};

export interface UnlockRecord {
  id: number;
  discipline: string;
  targetBeltId: number;
  unlockedAt: string;
  notes: string | null;
  beltName: string;
  beltColor: string;
  unlockedByName: string;
}

export interface FightData {
  id: number;
  userId: number;
  opponentName: string;
  eventName: string | null;
  fightDate: string;
  result: "victoria" | "derrota" | "empate";
  method: string | null;
  discipline: string;
  rounds: number | null;
  notes: string | null;
  registeredBy: number;
  createdAt: string;
}

export interface FightStats {
  total: number;
  victorias: number;
  derrotas: number;
  empates: number;
  winPercentage: number;
}

export interface AddFightData {
  userId: number;
  opponentName: string;
  eventName?: string;
  fightDate: string;
  result: string;
  method?: string;
  discipline: string;
  rounds?: number;
  notes?: string;
}

export interface ProfileBelt {
  discipline: string;
  beltName: string;
  beltColor: string;
  beltOrder: number;
  updatedAt: string | null;
}

export interface WeightData {
  initialWeight: number | null;
  currentWeight: number | null;
  targetWeight: number | null;
}

export interface ProfileData {
  id: number;
  email: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  subscriptionLevel: string;
  phone: string | null;
  isFighter: boolean;
  sedes: string[];
  roles: string[];
  belts: ProfileBelt[];
  fightStats: FightStats | null;
  weightData: WeightData | null;
  hasPayments: boolean;
}

export const profileApi = {
  getMyProfile: () => apiFetch<{ profile: ProfileData }>("/profile/me"),
  updateProfile: (data: { displayName?: string; nickname?: string | null; phone?: string | null; sedes?: string[]; currentPassword?: string; newPassword?: string }) =>
    apiFetch<{ user: UserData }>("/profile/me", { method: "PUT", body: data }),
  toggleFighterMode: (isFighter: boolean) =>
    apiFetch<{ success: boolean; isFighter: boolean }>("/profile/me/fighter", {
      method: "PUT",
      body: { isFighter },
    }),
  updateWeight: (currentWeight: number) =>
    apiFetch<{ weightData: WeightData }>("/profile/me/weight", {
      method: "PATCH",
      body: { currentWeight },
    }),
  deleteAccount: () =>
    apiFetch<{ ok: boolean }>("/profile/me", { method: "DELETE" }),
};

export const avatarApi = {
  uploadDirect: async (blob: Blob, mimeType: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/profile/me/avatar/upload`, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    const data = await res.json() as { objectPath: string };
    return data.objectPath;
  },
  getUploadUrl: (contentType: string) =>
    apiFetch<{ uploadURL: string; objectPath: string }>("/profile/me/avatar/url", {
      method: "POST",
      body: { contentType },
    }),
  saveAvatar: (objectPath: string) =>
    apiFetch<{ user: UserData }>("/profile/me/avatar", {
      method: "PUT",
      body: { objectPath },
    }),
};

export interface NotificationData {
  id: number;
  title: string;
  body: string;
  target: string[];
  createdAt: string;
  createdByName: string | null;
  readAt: string | null;
}

export const notificationsApi = {
  getAll: () =>
    apiFetch<{ notifications: NotificationData[]; unreadCount: number }>("/notifications"),

  send: (title: string, body: string, targets: string[]) =>
    apiFetch<{ notification: NotificationData }>("/notifications", {
      method: "POST",
      body: { title, body, targets },
    }),

  markAllRead: () =>
    apiFetch<{ ok: boolean }>("/notifications/read-all", { method: "POST" }),

  markRead: (id: number) =>
    apiFetch<{ ok: boolean }>(`/notifications/${id}/read`, { method: "POST" }),
};

export interface TrainingSystem {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface ExerciseCategoryData {
  id: number;
  trainingSystemId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface KnowledgeCategoryData {
  id: number;
  trainingSystemId: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface ExerciseData {
  id: number;
  trainingSystemId: number;
  exerciseCategoryId: number | null;
  categoryId: number | null;
  title: string;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  reqBeltDiscipline: string | null;
  reqBeltMinOrder: number | null;
  reqMinWins: number | null;
  reqMinAttendances: number | null;
  isLocked?: boolean;
  lockReason?: string | null;
  completedByUser?: boolean;
  prerequisiteIds?: number[];
}

export interface KnowledgeItemData {
  id: number;
  trainingSystemId: number;
  knowledgeCategoryId: number | null;
  categoryId: number | null;
  title: string;
  content: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  reqBeltDiscipline?: string | null;
  reqBeltMinOrder?: number | null;
  reqMinWins?: number | null;
  reqMinAttendances?: number | null;
  isLocked?: boolean;
  lockReason?: string | null;
  viewedByUser?: boolean;
  prerequisiteIds?: number[];
}

export interface TrainingSystemDetail {
  system: TrainingSystem;
  exercises: ExerciseData[];
  knowledge: KnowledgeItemData[];
  exerciseCategories: ExerciseCategoryData[];
  knowledgeCategories: KnowledgeCategoryData[];
}

export const trainingApi = {
  getSystems: () =>
    apiFetch<{ systems: TrainingSystem[] }>("/training/systems"),

  getSystem: (key: string) =>
    apiFetch<TrainingSystemDetail>(`/training/systems/${key}`),

  completeExercise: (id: number) =>
    apiFetch<{ completed: boolean }>(`/training/exercises/${id}/complete`, { method: "POST" }),

  uncompleteExercise: (id: number) =>
    apiFetch<{ uncompleted: boolean }>(`/training/exercises/${id}/complete`, { method: "DELETE" }),

  createExercise: (data: {
    trainingSystemId: number;
    title: string;
    description?: string;
    videoUrl?: string;
    imageUrl?: string;
    durationMinutes?: number;
    level?: string;
    orderIndex?: number;
    categoryId?: number;
    reqBeltDiscipline?: string | null;
    reqBeltMinOrder?: number | null;
    reqMinWins?: number | null;
    reqMinAttendances?: number | null;
    prerequisiteIds?: number[];
  }) => apiFetch<{ exercise: ExerciseData }>("/admin/training/exercises", { method: "POST", body: data }),

  updateExercise: (id: number, data: Partial<ExerciseData> & { prerequisiteIds?: number[] }) =>
    apiFetch<{ exercise: ExerciseData }>(`/admin/training/exercises/${id}`, { method: "PUT", body: data }),

  deleteExercise: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/training/exercises/${id}`, { method: "DELETE" }),

  viewKnowledge: (id: number) =>
    apiFetch<{ viewed: boolean }>(`/training/knowledge/${id}/view`, { method: "POST" }),

  createKnowledge: (data: {
    trainingSystemId: number;
    title: string;
    content?: string;
    videoUrl?: string;
    imageUrl?: string;
    orderIndex?: number;
    categoryId?: number;
    prerequisiteIds?: number[];
    reqBeltDiscipline?: string | null;
    reqBeltMinOrder?: number | null;
    reqMinWins?: number | null;
    reqMinAttendances?: number | null;
  }) => apiFetch<{ item: KnowledgeItemData }>("/admin/training/knowledge", { method: "POST", body: data }),

  updateKnowledge: (id: number, data: Partial<KnowledgeItemData> & { prerequisiteIds?: number[] }) =>
    apiFetch<{ item: KnowledgeItemData }>(`/admin/training/knowledge/${id}`, { method: "PUT", body: data }),

  deleteKnowledge: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/training/knowledge/${id}`, { method: "DELETE" }),

  createExerciseCategory: (data: { trainingSystemId: number; name: string; description?: string; imageUrl?: string; orderIndex?: number }) =>
    apiFetch<{ category: ExerciseCategoryData }>("/admin/training/exercise-categories", { method: "POST", body: data }),

  updateExerciseCategory: (id: number, data: Partial<ExerciseCategoryData>) =>
    apiFetch<{ category: ExerciseCategoryData }>(`/admin/training/exercise-categories/${id}`, { method: "PUT", body: data }),

  deleteExerciseCategory: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/training/exercise-categories/${id}`, { method: "DELETE" }),

  createKnowledgeCategory: (data: { trainingSystemId: number; name: string; description?: string; imageUrl?: string; orderIndex?: number }) =>
    apiFetch<{ category: KnowledgeCategoryData }>("/admin/training/knowledge-categories", { method: "POST", body: data }),

  updateKnowledgeCategory: (id: number, data: Partial<KnowledgeCategoryData>) =>
    apiFetch<{ category: KnowledgeCategoryData }>(`/admin/training/knowledge-categories/${id}`, { method: "PUT", body: data }),

  deleteKnowledgeCategory: (id: number) =>
    apiFetch<{ success: boolean }>(`/admin/training/knowledge-categories/${id}`, { method: "DELETE" }),

  reorderExercises: (items: { id: number; orderIndex: number }[]) =>
    apiFetch<{ success: boolean }>("/admin/training/exercises/reorder", { method: "PATCH", body: { items } }),

  reorderKnowledge: (items: { id: number; orderIndex: number }[]) =>
    apiFetch<{ success: boolean }>("/admin/training/knowledge/reorder", { method: "PATCH", body: { items } }),

  uploadCategoryImageDirect: async (blob: Blob, mimeType: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/admin/training/category-image-upload`, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    const data = await res.json() as { objectPath: string };
    return data.objectPath;
  },
};

export const fightsApi = {
  getMyFights: () =>
    apiFetch<{ isFighter: boolean; fights: FightData[]; stats: FightStats | null }>("/fights/me"),

  getUserFights: (userId: number) =>
    apiFetch<{ fighter: { id: number; displayName: string }; fights: FightData[]; stats: FightStats }>(
      `/fights/user/${userId}`
    ),

  addFight: (data: AddFightData) =>
    apiFetch<{ fight: FightData }>("/fights", { method: "POST", body: data }),

  deleteFight: (fightId: number) =>
    apiFetch<{ success: boolean }>(`/fights/${fightId}`, { method: "DELETE" }),

  updateFight: (fightId: number, data: Partial<AddFightData>) =>
    apiFetch<{ fight: FightData }>(`/fights/${fightId}`, { method: "PUT", body: data }),

  toggleFighterMode: (userId: number, isFighter: boolean) =>
    apiFetch<{ success: boolean; isFighter: boolean }>(`/admin/users/${userId}/fighter`, {
      method: "PUT",
      body: { isFighter },
    }),

  toggleHiddenFromCommunity: (userId: number, hiddenFromCommunity: boolean) =>
    apiFetch<{ success: boolean; hiddenFromCommunity: boolean }>(`/admin/users/${userId}/hidden-from-community`, {
      method: "PUT",
      body: { hiddenFromCommunity },
    }),
};

export interface ClassTrainingSystem {
  id: number;
  key: string;
  name: string;
}

export interface ClassData {
  id: number;
  createdByUserId: number;
  professorUserId: number | null;
  professorName: string | null;
  notes: string | null;
  qrToken: string | null;
  expiresAt: string;
  createdAt: string;
  trainingSystems: ClassTrainingSystem[];
  attendanceCount: number;
}

export interface ClassAttendee {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  attendedAt: string;
  rating: number | null;
}

export interface MyAttendanceItem {
  id: number;
  classId: number;
  attendedAt: string;
  rating: number | null;
  notes: string | null;
  systemNames: string[];
  createdByName: string | null;
}

export interface MyAttendanceStats {
  totalClasses: number;
  monthClasses: number;
  yearClasses: number;
  attendances: MyAttendanceItem[];
}

export const classesApi = {
  create: (data: {
    trainingSystemIds: number[];
    notes?: string;
    professorId?: number;
  }) => apiFetch<{ class: ClassData }>("/classes", { method: "POST", body: data }),

  getAll: () =>
    apiFetch<{ classes: ClassData[] }>("/classes"),

  update: (id: number, data: { trainingSystemIds?: number[]; notes?: string | null; professorId?: number | null }) =>
    apiFetch<{ success: boolean }>(`/classes/${id}`, { method: "PUT", body: data }),

  delete: (id: number) =>
    apiFetch<{ success: boolean }>(`/classes/${id}`, { method: "DELETE" }),

  getProfessors: () =>
    apiFetch<{ professors: { id: number; displayName: string; email: string }[] }>("/classes/professors"),

  scan: (qrToken: string) =>
    apiFetch<{ success: boolean; classId: number; className: string; attendedAt: string; createdByName: string | null }>("/classes/scan", {
      method: "POST",
      body: { qrToken },
    }),

  rate: (classId: number, rating: number) =>
    apiFetch<{ success: boolean; rating: number }>(`/classes/${classId}/rating`, {
      method: "PATCH",
      body: { rating },
    }),

  getMyAttendance: () =>
    apiFetch<MyAttendanceStats>("/classes/my-attendance"),

  getAttendees: (classId: number) =>
    apiFetch<{ attendees: ClassAttendee[] }>(`/classes/${classId}/attendees`),
};

export interface RatingsSummary {
  totalRatings: number;
  avgGlobal: number | null;
}

export interface ProfessorRating {
  professorId: number;
  displayName: string;
  avatarUrl: string | null;
  avgRating: number;
  totalRatings: number;
  classesCount: number;
}

export interface MartialArtRating {
  systemId: number;
  key: string;
  name: string;
  avgRating: number;
  totalRatings: number;
}

export interface RoulettePunishment {
  id: number;
  label: string;
  iconUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SpinResult {
  winnerId: number;
  winnerIndex: number;
  total: number;
  label: string;
  iconUrl: string | null;
}

export const rouletteApi = {
  list: () => apiFetch<{ punishments: RoulettePunishment[] }>("/roulette/punishments"),
  create: (data: { label: string; iconUrl?: string | null }) =>
    apiFetch<{ punishment: RoulettePunishment }>("/roulette/punishments", {
      method: "POST",
      body: data,
    }),
  update: (id: number, data: { label?: string; iconUrl?: string | null; isActive?: boolean }) =>
    apiFetch<{ punishment: RoulettePunishment }>(`/roulette/punishments/${id}`, {
      method: "PUT",
      body: data,
    }),
  remove: (id: number) =>
    apiFetch<{ success: boolean }>(`/roulette/punishments/${id}`, { method: "DELETE" }),
  spin: () => apiFetch<SpinResult>("/roulette/spin", { method: "POST" }),
  uploadIconDirect: async (blob: Blob, mimeType: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/roulette/icon-upload`, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    const data = (await res.json()) as { objectPath: string };
    return data.objectPath;
  },
};

export const ratingsApi = {
  summary: () => apiFetch<RatingsSummary>("/ratings/summary"),
  professors: () =>
    apiFetch<{ professors: ProfessorRating[] }>("/ratings/professors"),
  martialArts: () =>
    apiFetch<{ martialArts: MartialArtRating[] }>("/ratings/martial-arts"),
};

export interface EventItem {
  id: number;
  title: string;
  coverImageUrl: string | null;
  eventDate: string;
  eventEndDate: string | null;
  videoUrl: string | null;
  location: string;
  createdByUserId: number;
  attendeeCount: number;
  userWillAttend: boolean | null;
}

export interface EventAttendee {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChallengeUser {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChallengeItem {
  id: number;
  challengerId: number;
  challengedId: number;
  trainingSystemId: number;
  scheduledAt: string;
  notes: string | null;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
  winnerId: number | null;
  videoUrl: string | null;
  cancelRequestedBy: number | null;
  respondedAt: string | null;
  createdAt: string;
  trainingSystemName: string;
  challengerName: string;
  challengerNickname: string | null;
  challengerAvatar: string | null;
  challengedName: string;
  challengedNickname: string | null;
  challengedAvatar: string | null;
}

export const challengesApi = {
  getUsers: () =>
    apiFetch<{ users: ChallengeUser[] }>("/challenges/users"),

  getPendingCount: () =>
    apiFetch<{ count: number }>("/challenges/pending-count"),

  getAll: () =>
    apiFetch<{ pending: ChallengeItem[]; sent: ChallengeItem[]; active: ChallengeItem[]; past: ChallengeItem[] }>("/challenges"),

  create: (data: { challengedId: number; trainingSystemId: number; scheduledAt: string; notes?: string }) =>
    apiFetch<{ challenge: ChallengeItem }>("/challenges", { method: "POST", body: data }),

  respond: (id: number, decision: "accepted" | "declined") =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}/respond`, { method: "POST", body: { decision } }),

  undoResponse: (id: number) =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}/undo-response`, { method: "POST" }),

  setResult: (id: number, winnerId: number) =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}/result`, { method: "POST", body: { winnerId } }),

  update: (id: number, data: { trainingSystemId?: number; scheduledAt?: string; notes?: string | null }) =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}`, { method: "PATCH", body: data }),

  requestCancel: (id: number) =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}/request-cancel`, { method: "POST" }),

  confirmCancel: (id: number) =>
    apiFetch<{ deleted: boolean; challengeId: number }>(`/challenges/${id}/confirm-cancel`, { method: "POST" }),

  declineCancel: (id: number) =>
    apiFetch<{ challenge: ChallengeItem }>(`/challenges/${id}/decline-cancel`, { method: "POST" }),

  cancel: (id: number) =>
    apiFetch<{ success: boolean }>(`/challenges/${id}`, { method: "DELETE" }),

  registerPushToken: (token: string, platform: string) =>
    apiFetch<{ success: boolean }>("/push-token", { method: "POST", body: { token, platform } }),

  getCommunityPending: () =>
    apiFetch<{ challenges: ChallengeItem[] }>("/challenges/community-pending"),

  getCommunityActive: () =>
    apiFetch<{ challenges: ChallengeItem[] }>("/challenges/community-active"),

  getCommunityPast: () =>
    apiFetch<{ challenges: ChallengeItem[] }>("/challenges/community-past"),

  adminGetAll: () =>
    apiFetch<{ challenges: ChallengeItem[] }>("/admin/challenges"),

  adminUpdate: (id: number, data: { trainingSystemId?: number; scheduledAt?: string; notes?: string | null; status?: string; videoUrl?: string | null }) =>
    apiFetch<{ challenge: ChallengeItem }>(`/admin/challenges/${id}`, { method: "PATCH", body: data }),

  adminDelete: (id: number) =>
    apiFetch<{ deleted: boolean }>(`/admin/challenges/${id}`, { method: "DELETE" }),
};

export const eventsApi = {
  getAll: () =>
    apiFetch<{ events: EventItem[] }>("/events"),

  create: (data: { title: string; coverImageUrl?: string | null; eventDate: string; eventEndDate?: string | null; videoUrl?: string | null; location: string }) =>
    apiFetch<{ event: EventItem }>("/events", { method: "POST", body: data }),

  update: (id: number, data: { title?: string; coverImageUrl?: string | null; eventDate?: string; eventEndDate?: string | null; videoUrl?: string | null; location?: string }) =>
    apiFetch<{ event: EventItem }>(`/events/${id}`, { method: "PATCH", body: data }),

  delete: (id: number) =>
    apiFetch<{ success: boolean }>(`/events/${id}`, { method: "DELETE" }),

  attend: (id: number, willAttend: boolean) =>
    apiFetch<{ success: boolean; willAttend: boolean; attendeeCount: number }>(`/events/${id}/attend`, {
      method: "POST",
      body: { willAttend },
    }),

  getAttendees: (id: number) =>
    apiFetch<{ attendees: EventAttendee[] }>(`/events/${id}/attendees`),

  uploadCoverDirect: async (blob: Blob, mimeType: string): Promise<string> => {
    const res = await fetch(`${BASE_URL}/api/events/cover-upload`, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Upload failed");
    }
    const data = await res.json() as { objectPath: string };
    return data.objectPath;
  },
};

export interface RankingFighterEntry {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  draws: number;
  ninjutsuBelt: { name: string; color: string } | null;
  jiujitsuBelt: { name: string; color: string } | null;
}

export interface RankingAttendanceEntry {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  attendances: number;
  ninjutsuBelt: { name: string; color: string } | null;
  jiujitsuBelt: { name: string; color: string } | null;
}

export interface RankingWonChallenge {
  id: number;
  opponentName: string;
  artName: string;
  scheduledAt: string;
}

export interface RankingChallengeEntry {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  wins: number;
  wonChallenges: RankingWonChallenge[];
  ninjutsuBelt: { name: string; color: string } | null;
  jiujitsuBelt: { name: string; color: string } | null;
}

export const rankingApi = {
  getFighters: () =>
    apiFetch<{ ranking: RankingFighterEntry[] }>("/ranking/fighters"),

  getAttendance: (opts?: { period?: "month" | "year"; month?: string; year?: number }) => {
    const params = new URLSearchParams();
    if (opts?.period) params.set("period", opts.period);
    if (opts?.month) params.set("month", opts.month);
    if (opts?.year != null) params.set("year", String(opts.year));
    const qs = params.toString();
    return apiFetch<{
      ranking: RankingAttendanceEntry[];
      month: string;
      period: "month" | "year";
      monthValue: string;
      yearValue: number;
      label: string;
    }>(`/ranking/attendance${qs ? `?${qs}` : ""}`);
  },

  getChallenges: () =>
    apiFetch<{ ranking: RankingChallengeEntry[] }>("/ranking/challenges"),
};

export interface SuggestionItem {
  id: number;
  content: string;
  isReviewed: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

export const suggestionsApi = {
  create: (content: string) =>
    apiFetch<{ ok: boolean }>("/suggestions", { method: "POST", body: { content } }),

  adminList: () =>
    apiFetch<{ suggestions: SuggestionItem[] }>("/admin/suggestions"),

  adminUnreviewedCount: () =>
    apiFetch<{ count: number }>("/admin/suggestions/unreviewed-count"),

  adminMarkReviewed: (id: number) =>
    apiFetch<{ ok: boolean }>(`/admin/suggestions/${id}/reviewed`, { method: "PUT" }),

  adminDelete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/admin/suggestions/${id}`, { method: "DELETE" }),
};
