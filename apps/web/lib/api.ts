const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function req<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }
  return data as T;
}

export type AuthUser = { id: string; email: string; name: string; emailVerified: boolean };

export const api = {
  signup: (name: string, email: string, password: string) =>
    req<{ message: string; email: string }>("auth/signup", { name, email, password }),

  login: (email: string, password: string) =>
    req<{ access_token: string; user: AuthUser }>("auth/login", { email, password }),

  verifyOtp: (email: string, otp: string) =>
    req<{ access_token: string; user: AuthUser }>("auth/verify-otp", { email, otp }),

  resendOtp: (email: string) =>
    req<{ message: string }>("auth/resend-otp", { email }),

  forgotPassword: (email: string) =>
    req<{ message: string }>("auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    req<{ message: string }>("auth/reset-password", { token, password }),
};

export function saveToken(token: string) {
  localStorage.setItem("mantra_token", token);
}

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("mantra_token") : null;
}

export function clearToken() {
  localStorage.removeItem("mantra_token");
}
