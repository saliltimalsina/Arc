const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ── Token helpers ─────────────────────────────────────────────────────────

export function saveToken(token: string) {
  localStorage.setItem("mantra_token", token);
}

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("mantra_token") : null;
}

export function clearToken() {
  localStorage.removeItem("mantra_token");
}

// ── Core fetch wrapper ────────────────────────────────────────────────────

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = false,
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({ message: res.statusText }));
  if (!res.ok) {
    const err = new Error(data?.message ?? res.statusText) as Error & { status: number };
    err.status = res.status;
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
};

// ── Projects API types ────────────────────────────────────────────────────

export type ApiProject = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  client: string;
  status: string;
  ownerId: string;
};

export type ApiItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  points: number | null;
  sprintId: string | null;
  parentId: string | null;
  position: number;
  subtasks: ApiItem[];
  assignees: { id: string; user: { id: string; name: string; email: string } }[];
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

export type ApiProjectDetail = ApiProject & {
  sprints: ApiSprint[];
  items: ApiItem[];
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
};

// ── Projects ──────────────────────────────────────────────────────────────

export const projectsApi = {
  list: () => req<ApiProject[]>("GET", "projects", undefined, true),

  create: (data: { name: string; emoji?: string; color?: string; client?: string }) =>
    req<ApiProject>("POST", "projects", data, true),

  get: (id: string) => req<ApiProjectDetail>("GET", `projects/${id}`, undefined, true),

  update: (
    id: string,
    data: Partial<{ name: string; emoji: string; color: string; client: string; status: string }>,
  ) => req<ApiProject>("PATCH", `projects/${id}`, data, true),

  delete: (id: string) => req<void>("DELETE", `projects/${id}`, undefined, true),
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
    req<ApiItem[]>(
      "GET",
      `projects/${projectId}/items${sprintId ? `?sprintId=${sprintId}` : ""}`,
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
      sprintId: string | null;
      position: number;
    }>,
  ) => req<ApiItem>("PATCH", `projects/${projectId}/items/${itemId}`, data, true),

  delete: (projectId: string, itemId: string) =>
    req<void>("DELETE", `projects/${projectId}/items/${itemId}`, undefined, true),
};

export const commentsApi = {
  list: (projectId: string, itemId: string) =>
    req<ApiComment[]>("GET", `projects/${projectId}/items/${itemId}/comments`, undefined, true),

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
