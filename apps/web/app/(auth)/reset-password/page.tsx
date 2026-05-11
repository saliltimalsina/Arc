"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { CenteredShell, ThemeSwitch, Field, PasswordInput } from "@/components/auth/shared";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [theme, setTheme] = useState<"dark"|"light">("light");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const token = params.get("token") || "";

  useEffect(() => {
    if (!token) router.replace("/forgot-password");
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Minimum 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setError("");
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredShell theme={theme}>
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 10 }}>
        <ThemeSwitch theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      </div>

      <div className="auth-fadein">
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "var(--green-ping)", animation: "ping 2s ease-out infinite" }} />
                <div style={{ position: "relative", width: 56, height: 56, borderRadius: "50%", background: "var(--green)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-green)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 10px" }}>Password updated</h1>
            <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.65, margin: "0 0 32px" }}>
              You can now sign in with your new password.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{ width: "100%", height: 48, borderRadius: 12, background: "var(--warmth)", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "var(--shadow-btn)" }}
            >
              Go to login
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", color: "var(--text-3)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 8px" }}>Set new password</h1>
              <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                Choose a strong password for your Mantra account.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="New password" error={error && !confirm ? error : undefined}>
                <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" hasError={!!error && !confirm} />
              </Field>

              <Field label="Confirm password" error={error || undefined}>
                <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" hasError={!!error} />
              </Field>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: 48, marginTop: 6, borderRadius: 12,
                  background: loading ? "var(--surface-2)" : "var(--warmth)",
                  color: loading ? "var(--text-3)" : "white",
                  fontSize: 14, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: loading ? "none" : "var(--shadow-btn)",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                ) : "Update password"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", marginTop: 20 }}>
              <Link href="/login" style={{ color: "var(--orange)", fontWeight: 600 }}>Back to login</Link>
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.9);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </CenteredShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
