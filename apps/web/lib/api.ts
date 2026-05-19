const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Token helpers ─────────────────────────────────────────────────────────
// JWT now lives in an httpOnly cookie set by the API on login/verify-otp.
// localStorage helpers retained for backwards compat during migration; bearer
// header used as fallback if a stored token exists.

export function saveToken(token: string) {
  if (typeof window !== "undefined") localStorage.setItem("mantra_token", token);
}

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("mantra_token") : null;
}

export function clearToken() {
  if (typeof window !== "undefined") localStorage.removeItem("mantra_token");
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[-.+*]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ── Core fetch wrapper ────────────────────────────────────────────────────

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  _auth = false,
): Promise<T> {
  const token = getToken();
  const csrf = readCookie("mantra_csrf");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!SAFE_METHODS.has(method) && csrf) headers["X-CSRF-Token"] = csrf;

  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    credentials: "include",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({ message: res.statusText }));
  if (!res.ok) {
    // Nest validation errors come back as message: string[]; flatten to one line
    const raw = data?.message;
    const flat = Array.isArray(raw) ? raw.join(", ") : raw;
    const err = new Error(flat ?? res.statusText) as Error & { status: number };
    err.status = res.status;
    handleApiError(err, path);
    throw err;
  }
  return data as T;
}

// Silenced paths/methods — fetches where 401 is expected (e.g. probing auth state)
const SILENT = new Set(["auth/me", "auth/login", "auth/signup", "auth/verify-otp", "auth/forgot-password", "auth/reset-password", "auth/logout"]);

function handleApiError(err: Error & { status: number }, path: string) {
  if (SILENT.has(path)) return;
  // 404 means the caller should redirect / re-route — surfacing a toast just
  // doubles the confusion. Let the caller handle the navigation.
  if (err.status === 404) return;
  if (typeof window === "undefined") return;
  // Lazy import to avoid SSR cycle
  import("../hooks/useToast").then(({ pushToast }) => {
    const msg =
      err.status === 401 ? "Session expired. Please sign in again." :
      err.status === 403 ? `Permission denied: ${err.message}` :
      err.status === 429 ? "Too many requests. Slow down." :
      err.status >= 500 ? "Server error. Try again shortly." :
      err.message;
    pushToast(msg, "error");
  }).catch(() => { /* ignore */ });
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const csrf = readCookie("mantra_csrf");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (csrf) headers["X-CSRF-Token"] = csrf;

  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({ message: res.statusText }));
  if (!res.ok) {
    const err = new Error(data?.message ?? res.statusText) as Error & { status: number };
    err.status = res.status;
    handleApiError(err, path);
    throw err;
  }
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export type AuthUser = { id: string; email: string; name: string; emailVerified: boolean };

export const api = {
  signup: (name: string, email: string, password: string) =>
    req<{ message: string; email: string }>("POST", "auth/signup", { name, email, password }),

  login: (email: string, password: string) =>
    req<{ access_token: string; user: AuthUser }>("POST", "auth/login", { email, password }),

  verifyOtp: (email: string, otp: string) =>
    req<{ access_token: string; user: AuthUser }>("POST", "auth/verify-otp", { email, otp }),

  resendOtp: (email: string) =>
    req<{ message: string }>("POST", "auth/resend-otp", { email }),

  forgotPassword: (email: string) =>
    req<{ message: string }>("POST", "auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    req<{ message: string }>("POST", "auth/reset-password", { token, password }),

  getMe: () => req<AuthUser>("GET", "auth/me", undefined, true),

  logout: () => req<void>("POST", "auth/logout", {}),
};

// ── Notifications API ─────────────────────────────────────────────────────

export type ApiNotification = {
  id: string;
  recipientId: string;
  kind: string;
  entityType: string | null;
  entityId: string | null;
  payload: any;
  readAt: string | null;
  createdAt: string;
};

export const notificationsApi = {
  list: (opts: { unread?: boolean; limit?: number; cursor?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.unread) qs.set("unread", "1");
    if (opts.limit) qs.set("limit", String(opts.limit));
    if (opts.cursor) qs.set("cursor", opts.cursor);
    const tail = qs.toString();
    return req<ApiNotification[]>("GET", `notifications${tail ? `?${tail}` : ""}`);
  },
  unreadCount: () => req<{ count: number }>("GET", "notifications/unread-count"),
  markRead: (id: string) => req<ApiNotification>("POST", `notifications/${id}/read`, {}),
  markAllRead: () => req<{ count: number }>("POST", "notifications/read-all", {}),
};

// ── Attachments API ───────────────────────────────────────────────────────

export type ApiAttachment = {
  id: string;
  ownerType: string;
  ownerId: string;
  itemId: string | null;
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  createdAt: string;
};

// ── Lunch API ─────────────────────────────────────────────────────────────

export type ApiMealAddon = {
  id: string; key: string; name: string; unitPriceMinor: number; maxQty: number;
};

export type ApiMeal = {
  id: string;
  workspaceId: string;
  key: string;
  name: string;
  emoji: string;
  description: string | null;
  basePriceMinor: number;
  kcal: number | null;
  dietary: string | null;
  availableDows: number[];
  extraLabel: string | null;
  sortOrder: number;
  active: boolean;
  addons?: ApiMealAddon[];
};

export type ApiLunchOrder = {
  id: string;
  userId: string;
  workspaceId: string;
  date: string;
  mealId: string;
  meal?: { id: string; key: string; name: string; emoji: string; basePriceMinor: number };
  addons: Record<string, number> | null;
  status: string;
  onBehalfOfUserId: string | null;
  totalCostMinor: number;
  notes: string | null;
  cancelledAt: string | null;
  lockedAt: string | null;
};

export type ApiLunchTransaction = {
  id: string;
  kind: "topup" | "charge" | "refund" | "adjustment";
  amountMinor: number;
  status: "verified" | "pending" | "failed";
  provider: string | null;
  externalRef: string | null;
  description: string;
  orderId: string | null;
  createdAt: string;
  verifiedAt: string | null;
};

export type ApiCutoff = {
  workspaceId: string;
  cutoffHour: number;
  cutoffMinute: number;
  gracePeriodMinutes: number;
  timezone: string;
};

export type ApiCalendarCell = {
  date: string;
  day: number;
  mealKey: string;
  mealName: string;
  emoji: string;
  status: string;
  totalCostMinor: number;
};

export type ApiSuggestion = {
  id: string;
  category: string;
  body: string;
  status: "open" | "reviewed" | "closed";
  createdAt: string;
  user?: { id: string; name: string; email: string };
};

export const lunchApi = {
  meals: (date?: string) => req<ApiMeal[]>("GET", `lunch/meals${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  createMeal: (data: Partial<ApiMeal>) => req<ApiMeal>("POST", "lunch/meals", data),
  updateMeal: (id: string, data: Partial<ApiMeal>) => req<ApiMeal>("PATCH", `lunch/meals/${id}`, data),
  deleteMeal: (id: string) => req<void>("DELETE", `lunch/meals/${id}`),

  orders: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    return req<ApiLunchOrder[]>("GET", `lunch/orders${qs.toString() ? `?${qs.toString()}` : ""}`);
  },
  calendar: (month: string) => req<ApiCalendarCell[]>("GET", `lunch/calendar?month=${month}`),
  placeOrder: (data: { date: string; mealId: string; addons?: Record<string, number>; onBehalfOfUserId?: string; notes?: string }) =>
    req<ApiLunchOrder>("POST", "lunch/orders", data),
  updateOrder: (id: string, data: { mealId?: string; addons?: Record<string, number>; notes?: string }) =>
    req<ApiLunchOrder>("PATCH", `lunch/orders/${id}`, data),
  cancelOrder: (id: string) => req<ApiLunchOrder>("DELETE", `lunch/orders/${id}`),

  wallet: () => req<{ balanceMinor: number; recent: ApiLunchTransaction[] }>("GET", "lunch/wallet"),
  transactions: (limit?: number, cursor?: string) => {
    const qs = new URLSearchParams();
    if (limit) qs.set("limit", String(limit));
    if (cursor) qs.set("cursor", cursor);
    return req<{ data: ApiLunchTransaction[]; nextCursor: string | null }>("GET", `lunch/transactions${qs.toString() ? `?${qs.toString()}` : ""}`);
  },
  topup: (amountMinor: number, provider: "esewa" | "khalti" | "manual", externalRef?: string) =>
    req<ApiLunchTransaction>("POST", "lunch/wallet/topup", { amountMinor, provider, externalRef }),
  verifyTopup: (id: string) => req<ApiLunchTransaction>("POST", `lunch/wallet/topups/${id}/verify`, {}),
  pendingTopups: () => req<any[]>("GET", "lunch/wallet/pending-topups"),

  cutoff: () => req<ApiCutoff>("GET", "lunch/cutoff"),
  setCutoff: (data: Partial<ApiCutoff>) => req<ApiCutoff>("PATCH", "lunch/cutoff", data),

  teamStatus: (date?: string) => req<any[]>("GET", `lunch/team-status${date ? `?date=${date}` : ""}`),
  kitchenSheet: (date: string) => req<any>("GET", `lunch/kitchen-sheet?date=${date}`),

  createSuggestion: (category: string, body: string) =>
    req<ApiSuggestion>("POST", "lunch/suggestions", { category, body }),
  listSuggestions: (status?: string) => req<ApiSuggestion[]>("GET", `lunch/suggestions${status ? `?status=${status}` : ""}`),
  setSuggestionStatus: (id: string, status: string) => req<ApiSuggestion>("PATCH", `lunch/suggestions/${id}`, { status }),

  grantProxy: (targetUserId: string, expiresAt?: string) =>
    req<any>("POST", `lunch/proxies/${targetUserId}`, { expiresAt }),
  revokeProxy: (targetUserId: string) => req<void>("DELETE", `lunch/proxies/${targetUserId}`),
  proxiesGranted: () => req<any[]>("GET", "lunch/proxies/granted"),
  proxiesReceived: () => req<any[]>("GET", "lunch/proxies/received"),
};

// ── Workspaces API ────────────────────────────────────────────────────────

export type ApiWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isOwner: boolean;
  isDefault: boolean;
};

export const workspacesApi = {
  listMine: () => req<ApiWorkspace[]>("GET", "workspaces"),
  create: (name: string) => req<{ id: string; name: string; slug: string }>("POST", "workspaces", { name }),
  setDefault: (id: string) => req<{ defaultWorkspaceId: string }>("POST", `workspaces/${id}/default`, {}),
};

export const attachmentsApi = {
  upload: (file: File, ownerType: string, ownerId: string) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload<ApiAttachment>(`attachments?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`, fd);
  },
  list: (ownerType: string, ownerId: string) =>
    req<ApiAttachment[]>("GET", `attachments?ownerType=${encodeURIComponent(ownerType)}&ownerId=${encodeURIComponent(ownerId)}`),
  remove: (id: string) => req<void>("DELETE", `attachments/${id}`),
};

// ── Projects API types ────────────────────────────────────────────────────

export type ApiProject = {
  id: string;
  name: string;
  key: string;
  emoji: string;
  color: string;
  client: string;
  status: string;
  description: string | null;
  ownerId: string;
};

export type ApiMyStats = {
  activeProjects: number;
  openItems: number;
  inReview: number;
  completedItems: number;
  blockers: number;
};

export type ApiMyItem = {
  item: ApiItem & {
    project: { id: string; name: string; emoji: string; color: string; key: string };
  };
};

export type ApiItem = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  points: number | null;
  dueDate: string | null;
  sprintId: string | null;
  parentId: string | null;
  reporterId: string | null;
  position: number;
  subtasks: ApiItem[];
  assignees: { id: string; user: { id: string; name: string; email: string } }[];
  reporter?: { id: string; name: string; email: string } | null;
};

export type ApiSprint = {
  id: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  position: number;
  items: ApiItem[];
};

export type ApiComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
};

export type ApiItemActivity = {
  id: string;
  itemId: string;
  field: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
};

export type ApiMilestone = {
  id: string;
  projectId: string;
  name: string;
  date: string;
  position: number;
};

export type ApiGoal = {
  id: string;
  projectId: string;
  name: string;
  emoji: string;
  color: string;
  startDate: string;
  endDate: string;
  position: number;
};

export type ApiProjectDetail = ApiProject & {
  sprints: ApiSprint[];
  items: ApiItem[];
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  milestones: ApiMilestone[];
  goals: ApiGoal[];
  recentlyClosed?: (Pick<ApiItem, "id" | "number" | "title" | "type" | "status" | "priority"> & { updatedAt: string; assignees: { user: { id: string; name: string } }[] })[];
};

export type ApiItemSearchResult = {
  id: string; number: number; title: string; type: string; status: string; priority: string; updatedAt: string;
};

export type ApiActivityEvent =
  | { type: "item_created"; id: string; title: string; itemType: string; status: string; actor: string | null; projectName: string | null; at: string }
  | { type: "comment";      id: string; body: string; itemTitle: string; actor: string; projectName: string | null; at: string }
  | { type: "sprint_started" | "sprint_completed"; id: string; name: string; actor: string | null; projectName: string | null; at: string };

// ── Projects ──────────────────────────────────────────────────────────────

export type ApiDashboard = {
  hero: {
    state: "normal" | "deadline" | "achievement";
    headline: string;
    sub: string;
    tag: string;
    focusMinutes: number;
    momentumPct: number;
    blockers: number;
    completedThisWeek: number;
  };
  timeline: {
    days: number[];
    events: { kind: "complete" | "milestone" | "recognition" | "skill"; text: string; time: string }[];
  };
  workload: { rows: string[][] };
  team: { name: string; initials: string; color: string; status: string; statusText: string }[];
  activeFocus: { projectId: string; projectName: string } | null;
  journey: { week: number[]; month: number[]; year: number[] };
  snapshots: {
    id: string; key: string; name: string; emoji: string;
    pct: number; due: string; health: "good" | "warn"; budget: string; blockers: number;
    avatars: { initials: string; color: string }[];
  }[];
};

export const meApi = {
  items:     () => req<ApiMyItem[]>("GET",        "projects/me/items",    undefined, true),
  stats:     () => req<ApiMyStats>("GET",         "projects/me/stats",    undefined, true),
  activity:  () => req<ApiActivityEvent[]>("GET", "projects/me/activity", undefined, true),
  dashboard: () => req<ApiDashboard>("GET",       "dashboard",            undefined, true),
};

export const projectsApi = {
  list: () => req<ApiProject[]>("GET", "projects", undefined, true),

  create: (data: { name: string; key?: string; emoji?: string; color?: string; client?: string; description?: string }) =>
    req<ApiProject>("POST", "projects", data, true),

  get: (id: string) => req<ApiProjectDetail>("GET", `projects/${id}`, undefined, true),

  update: (
    id: string,
    data: Partial<{ name: string; emoji: string; color: string; client: string; status: string; description: string }>,
  ) => req<ApiProject>("PATCH", `projects/${id}`, data, true),

  delete: (id: string) => req<void>("DELETE", `projects/${id}`, undefined, true),

  restore: (id: string) => req<{ id: string; restored: boolean }>("POST", `projects/${id}/restore`, {}, true),
  listTrash: () => req<Array<{ id: string; name: string; emoji: string; color: string; key: string; deletedAt: string; ownerId: string }>>("GET", "projects/trash/list", undefined, true),

  activity: (id: string) => req<ApiActivityEvent[]>("GET", `projects/${id}/activity`, undefined, true),

  members: {
    add: (projectId: string, email: string, role?: string) =>
      req<{ members: ApiProjectDetail["members"] }>("POST", `projects/${projectId}/members`, { email, role }, true),
    remove: (projectId: string, userId: string) =>
      req<void>("DELETE", `projects/${projectId}/members/${userId}`, undefined, true),
    updateRole: (projectId: string, userId: string, role: string) =>
      req<{ members: ApiProjectDetail["members"] }>("PATCH", `projects/${projectId}/members/${userId}`, { role }, true),
  },

  milestones: {
    create: (projectId: string, data: { name: string; date: string }) =>
      req<ApiMilestone>("POST", `projects/${projectId}/milestones`, data, true),
    update: (projectId: string, id: string, data: Partial<{ name: string; date: string }>) =>
      req<ApiMilestone>("PATCH", `projects/${projectId}/milestones/${id}`, data, true),
    delete: (projectId: string, id: string) =>
      req<void>("DELETE", `projects/${projectId}/milestones/${id}`, undefined, true),
  },
};

export const sprintsApi = {
  list: (projectId: string) =>
    req<ApiSprint[]>("GET", `projects/${projectId}/sprints`, undefined, true),

  create: (projectId: string, data: { name: string; goal?: string; startDate?: string; endDate?: string }) =>
    req<ApiSprint>("POST", `projects/${projectId}/sprints`, data, true),

  update: (
    projectId: string,
    sprintId: string,
    data: Partial<{ name: string; goal: string; startDate: string; endDate: string; status: string }>,
  ) => req<ApiSprint>("PATCH", `projects/${projectId}/sprints/${sprintId}`, data, true),

  complete: (projectId: string, sprintId: string, moveToSprintId?: string) =>
    req<ApiSprint>(
      "POST",
      `projects/${projectId}/sprints/${sprintId}/complete`,
      { moveToSprintId },
      true,
    ),

  delete: (projectId: string, sprintId: string) =>
    req<void>("DELETE", `projects/${projectId}/sprints/${sprintId}`, undefined, true),
};

export const itemsApi = {
  list: (projectId: string, sprintId?: string) =>
    req<{ data: ApiItem[]; nextCursor: string | null }>(
      "GET",
      `projects/${projectId}/items${sprintId ? `?sprintId=${sprintId}` : ""}`,
      undefined,
      true,
    ).then(r => r.data),

  search: (projectId: string, q: string) =>
    req<ApiItemSearchResult[]>(
      "GET",
      `projects/${projectId}/items/search?q=${encodeURIComponent(q)}`,
      undefined,
      true,
    ),

  create: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      type?: string;
      status?: string;
      priority?: string;
      points?: number;
      sprintId?: string;
      parentId?: string;
    },
  ) => req<ApiItem>("POST", `projects/${projectId}/items`, data, true),

  update: (
    projectId: string,
    itemId: string,
    data: Partial<{
      title: string;
      description: string;
      type: string;
      status: string;
      priority: string;
      points: number;
      dueDate: string | null;
      sprintId: string | null;
      position: number;
      reporterId: string | null;
      parentId: string | null;
    }>,
  ) => req<ApiItem>("PATCH", `projects/${projectId}/items/${itemId}`, data, true),

  delete: (projectId: string, itemId: string) =>
    req<void>("DELETE", `projects/${projectId}/items/${itemId}`, undefined, true),

  setAssignee: (projectId: string, itemId: string, userId: string | null) =>
    req<ApiItem>("PUT", `projects/${projectId}/items/${itemId}/assignee`, { userId }, true),
};

export const goalsApi = {
  list: (projectId: string) =>
    req<ApiGoal[]>("GET", `projects/${projectId}/goals`, undefined, true),

  create: (projectId: string, data: { name: string; emoji?: string; color?: string; startDate: string; endDate: string }) =>
    req<ApiGoal>("POST", `projects/${projectId}/goals`, data, true),

  update: (projectId: string, goalId: string, data: Partial<{ name: string; emoji: string; color: string; startDate: string; endDate: string }>) =>
    req<ApiGoal>("PATCH", `projects/${projectId}/goals/${goalId}`, data, true),

  delete: (projectId: string, goalId: string) =>
    req<void>("DELETE", `projects/${projectId}/goals/${goalId}`, undefined, true),
};

export const commentsApi = {
  list: (projectId: string, itemId: string) =>
    req<{ data: ApiComment[]; nextCursor: string | null }>(
      "GET",
      `projects/${projectId}/items/${itemId}/comments`,
      undefined,
      true,
    ).then(r => r.data),

  create: (projectId: string, itemId: string, body: string) =>
    req<ApiComment>(
      "POST",
      `projects/${projectId}/items/${itemId}/comments`,
      { body },
      true,
    ),

  delete: (projectId: string, commentId: string) =>
    req<void>("DELETE", `projects/${projectId}/comments/${commentId}`, undefined, true),
};

export const itemActivityApi = {
  list: (projectId: string, itemId: string) =>
    req<{ data: ApiItemActivity[]; nextCursor: string | null }>(
      "GET",
      `projects/${projectId}/items/${itemId}/activity`,
      undefined,
      true,
    ).then(r => r.data),
};

// ── Teams API types ───────────────────────────────────────────────────────

export type ApiTeamMember = {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string; email: string };
};

export type ApiTeam = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: string;
  members: ApiTeamMember[];
  _count?: { projects: number };
};

export type ApiTeamDetail = ApiTeam & {
  projects: { id: string; name: string; emoji: string; color: string; status: string }[];
};

export type ApiUserSearchResult = { id: string; name: string; email: string };

// ── Teams ─────────────────────────────────────────────────────────────────

export const teamsApi = {
  list: () => req<ApiTeam[]>("GET", "teams", undefined, true),

  create: (data: { name: string; emoji?: string; color?: string }) =>
    req<ApiTeamDetail>("POST", "teams", data, true),

  get: (id: string) => req<ApiTeamDetail>("GET", `teams/${id}`, undefined, true),

  update: (id: string, data: Partial<{ name: string; emoji: string; color: string }>) =>
    req<ApiTeamDetail>("PATCH", `teams/${id}`, data, true),

  delete: (id: string) => req<void>("DELETE", `teams/${id}`, undefined, true),

  addMember: (teamId: string, email: string, role?: string) =>
    req<ApiTeamDetail>("POST", `teams/${teamId}/members`, { email, role }, true),

  removeMember: (teamId: string, userId: string) =>
    req<void>("DELETE", `teams/${teamId}/members/${userId}`, undefined, true),

  updateMemberRole: (teamId: string, userId: string, role: string) =>
    req<ApiTeamMember>("PATCH", `teams/${teamId}/members/${userId}`, { role }, true),
};

export const usersApi = {
  search: (q: string) =>
    req<ApiUserSearchResult[]>("GET", `users/search?q=${encodeURIComponent(q)}`, undefined, true),
};
