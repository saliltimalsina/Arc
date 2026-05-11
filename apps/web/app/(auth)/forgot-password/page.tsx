"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { CenteredShell, ThemeSwitch, Field, inputStyle, onFocus, onBlur } from "@/components/auth/shared";

type Step = "email" | "sent";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark"|"light">("light");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Email is required"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email"); return; }
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setStep("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenteredShell theme={theme}>
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 10 }}>
        <ThemeSwitch theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      </div>

      <AnimatePresence mode="wait">
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: [0.32, 0.72, 0.16, 1] }}
          >
            {/* Icon */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "var(--surface-2)", border: "1px solid var(--line)",
                display: "grid", placeItems: "center", color: "var(--text-3)",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
            </div>

            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
                Reset your password
              </h1>
              <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                Enter your work email and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Work email" error={error}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  style={inputStyle(!!error)}
                  onFocus={onFocus}
                  onBlur={e => onBlur(e, !!error)}
                  autoFocus
                />
              </Field>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", height: 48, marginTop: 6, borderRadius: 12,
                  background: loading ? "var(--surface-2)" : "var(--warmth)",
                  color: loading ? "var(--text-3)" : "white",
                  fontSize: 14, fontWeight: 600,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: loading ? "none" : "var(--shadow-btn)",
                  border: "none", cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1, transition: "filter .25s, transform .15s",
                }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; }}
                onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "scale(0.99)"; }}
                onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                {loading ? (
                  <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                ) : "Send reset link"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", marginTop: 20 }}>
              Remember it?{" "}
              <Link href="/login" style={{ color: "var(--orange)", fontWeight: 600 }}>Back to login</Link>
            </p>
          </motion.div>

        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.42, ease: [0.32, 0.72, 0.16, 1] }}
            style={{ textAlign: "center" }}
          >
            {/* Success mark */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
              <div style={{ position: "relative", width: 56, height: 56 }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "var(--green-ping)",
                  animation: "ping 2s ease-out infinite",
                }} />
                <div style={{
                  position: "relative", width: 56, height: 56, borderRadius: "50%",
                  background: "var(--green)", display: "grid", placeItems: "center",
                  boxShadow: "var(--shadow-green)",
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 10px" }}>
              Reset link sent
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.65, margin: "0 0 8px" }}>
              Check <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{email}</span> for a link to reset your password. It expires in 15 minutes.
            </p>
            <p style={{ fontSize: 13, color: "var(--text-4)", margin: "0 0 32px" }}>
              Didn&apos;t get it? Check spam or{" "}
              <button type="button" onClick={() => setStep("email")} style={{ color: "var(--orange)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: 0 }}>
                try again
              </button>
            </p>

            <button
              type="button"
              onClick={() => router.push("/login")}
              style={{
                width: "100%", height: 48, borderRadius: 12,
                background: "var(--surface)", border: "1px solid var(--line)",
                color: "var(--text)", fontSize: 14, fontWeight: 600,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "border-color .25s, background .25s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line-strong)"; (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--line)"; (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
            >
              Back to login
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.9);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </CenteredShell>
  );
}
