"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveToken } from "@/lib/api";
import { PasswordInput } from "@/components/auth/shared";
import { Spinner } from "@heroui/react";

/* ── Icons ── */
const IconSun = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);
const IconMoon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c2.5 0 4.6.9 6.2 2.4L16 7.5C14.9 6.6 13.5 6 12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6c2.7 0 5-1.7 5.7-4H12v-2.5h9c0 .2 0 .3 0 .5z"/>
  </svg>
);
const IconMicrosoft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/>
    <rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>
  </svg>
);
const IconSlack = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9.5" y="3" width="3" height="9" rx="1.5"/>
    <rect x="3" y="9.5" width="9" height="3" rx="1.5"/>
    <rect x="11.5" y="12" width="3" height="9" rx="1.5"/>
    <rect x="12" y="11.5" width="9" height="3" rx="1.5"/>
  </svg>
);

/* ── Theme pill toggle ── */
function ThemeSwitch({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Switch to light" : "Switch to dark"}
      style={{
        height: 40, padding: 0, display: "inline-flex",
        alignItems: "center", background: "transparent", border: 0, cursor: "pointer",
      }}
    >
      <span style={{
        position: "relative", width: 64, height: 32, borderRadius: 999,
        background: "var(--surface)", border: "1px solid var(--line)",
        display: "flex", alignItems: "center",
        transition: "border-color .35s var(--ease)",
      }}>
        {/* sliding thumb */}
        <span style={{
          position: "absolute", top: 3, left: 3,
          width: 26, height: 26, borderRadius: "50%",
          background: "var(--warmth)",
          display: "grid", placeItems: "center",
          color: "white",
          boxShadow: "0 4px 12px -2px rgba(249,115,22,0.45)",
          transform: isDark ? "translateX(32px)" : "translateX(0px)",
          transition: "transform .4s var(--ease)",
          zIndex: 2,
        }}>
          {isDark ? <IconMoon /> : <IconSun />}
        </span>
        {/* sun icon left */}
        <span style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 32,
          display: "grid", placeItems: "center",
          color: "var(--text-4)", pointerEvents: "none",
          opacity: isDark ? 1 : 0, transition: "opacity .35s var(--ease)",
        }}>
          <IconSun />
        </span>
        {/* moon icon right */}
        <span style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 32,
          display: "grid", placeItems: "center",
          color: "var(--text-4)", pointerEvents: "none",
          opacity: isDark ? 0 : 1, transition: "opacity .35s var(--ease)",
        }}>
          <IconMoon />
        </span>
      </span>
    </button>
  );
}

/* ── Heatmap levels ── */
const HEAT = [0,1,2,1,3,4,2,1,0,2,3,2,1,3,4,2,1,0,2,3,1,2,4,3,2,1,3,4,2,1,3,2,1,0,2,3];
const heatColor = (l: number) => {
  if (!l) return "var(--surface-2)";
  const a = [0.20, 0.45, 0.70, 1][l - 1];
  return l === 4 ? "linear-gradient(135deg,#FF6B5C,#F97316,#F5A524)" : `rgba(249,115,22,${a})`;
};

export default function LoginPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.login(email, password);
      saveToken(res.access_token);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      // unverified email → redirect to verify
      if (msg.includes("not verified")) {
        sessionStorage.setItem("verify_email", email);
        router.push("/verify");
      } else {
        setErrors({ password: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "Satoshi, system-ui, sans-serif" }}>
      {/* Ambient bg */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(900px 500px at 8% -10%, rgba(249,115,22,0.10), transparent 60%), radial-gradient(800px 600px at 95% 110%, rgba(56,142,247,0.06), transparent 60%)",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        display: "grid", gridTemplateColumns: "1fr 1.05fr",
        minHeight: "100vh",
      }}>

        {/* ── LEFT: form ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            padding: "56px 64px 48px",
            display: "flex", flexDirection: "column", gap: 32,
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* Logo */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600, letterSpacing: "-0.02em", fontSize: 16 }}>
              <span style={{
                width: 30, height: 30, borderRadius: 9,
                background: "var(--warmth)",
                display: "grid", placeItems: "center",
                color: "white", fontWeight: 800, fontSize: 13,
                boxShadow: "0 6px 20px -6px rgba(249,115,22,0.55)",
              }}>M</span>
              Mantra
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <ThemeSwitch theme={theme} onToggle={toggle} />
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                New here?{" "}
                <Link href="/signup" style={{ color: "var(--text-2)", borderBottom: "1px dashed var(--line-strong)", paddingBottom: 1 }}>
                  Create account
                </Link>
              </span>
            </div>
          </div>

          {/* Form center */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 380 }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0.16, 1] }}
            >
              <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 6px" }}>
                Welcome back to your{" "}
                <em style={{ fontStyle: "normal", background: "var(--warmth)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  momentum
                </em>.
              </h1>
              <p style={{ color: "var(--text-3)", margin: "0 0 28px", fontSize: 14, lineHeight: 1.6 }}>
                Pick up exactly where you left off — your timer, your flow, your team — already loaded.
              </p>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Email */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 8 }}>
                    Work email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    style={{
                      width: "100%", height: 48, padding: "0 16px",
                      borderRadius: 12, fontSize: 14,
                      background: "var(--surface)",
                      border: `1px solid ${errors.email ? "var(--red)" : "var(--line)"}`,
                      color: "var(--text)", outline: "none",
                      transition: "border-color .25s, box-shadow .25s",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.12)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = errors.email ? "var(--red)" : "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  {errors.email && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--red)" }}>{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 8 }}>
                    Password
                  </label>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} hasError={!!errors.password} />
                  {errors.password && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--red)" }}>{errors.password}</p>}
                </div>

                {/* Remember + forgot */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <span
                      onClick={() => setRemember(r => !r)}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        background: remember ? "var(--warmth)" : "var(--surface)",
                        border: remember ? "1.5px solid transparent" : "1.5px solid var(--line-strong)",
                        display: "grid", placeItems: "center",
                        transition: "background .2s, border-color .2s",
                        cursor: "pointer",
                      }}
                    >
                      {remember && (
                        <svg width="9" height="9" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    Stay signed in for 30 days
                  </label>
                  <Link href="/forgot-password" style={{ color: "var(--text-3)" }}>Forgot?</Link>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%", height: 48, marginTop: 6,
                    borderRadius: 12,
                    background: loading ? "var(--surface-2)" : "var(--warmth)",
                    color: loading ? "var(--text-3)" : "white",
                    fontSize: 14, fontWeight: 600,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    boxShadow: loading ? "none" : "0 10px 30px -10px rgba(249,115,22,0.55)",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    transition: "transform .15s, filter .25s, opacity .25s",
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = "brightness(1.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = "none"; }}
                  onMouseDown={e => { if (!loading) e.currentTarget.style.transform = "scale(0.99)"; }}
                  onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  {loading ? <Spinner size="sm" /> : (<>Continue your day <IconArrow /></>)}
                </button>

              </form>
            </motion.div>
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12, color: "var(--text-3)" }}>
            By continuing you agree to Mantra&apos;s{" "}
            <a href="#" style={{ color: "var(--text-2)", borderBottom: "1px dashed var(--line-strong)" }}>Terms</a>
            {" "}and{" "}
            <a href="#" style={{ color: "var(--text-2)", borderBottom: "1px dashed var(--line-strong)" }}>Privacy</a>.
          </p>
        </motion.div>

        {/* ── RIGHT: preview ── */}
        <div style={{
          background: "var(--bg-2)",
          borderLeft: "1px solid var(--line)",
          padding: 40,
          display: "flex", flexDirection: "column", gap: 18,
          position: "relative", overflow: "hidden",
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(500px 320px at 80% 10%, rgba(249,115,22,0.18), transparent 60%), radial-gradient(420px 320px at 10% 95%, rgba(56,142,247,0.10), transparent 60%)",
          }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Heatmap card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.32, 0.72, 0.16, 1] }}
              style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 10, fontWeight: 600 }}>
                26 days · contribution
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(20, 1fr)", gap: 3 }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const l = HEAT[i % HEAT.length];
                  return (
                    <span
                      key={i}
                      style={{
                        aspectRatio: "1", borderRadius: 3,
                        background: l === 4 ? "linear-gradient(135deg,#FF6B5C,#F97316,#F5A524)" : heatColor(l),
                      }}
                    />
                  );
                })}
              </div>
            </motion.div>

            {/* Today Flow card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.32, 0.72, 0.16, 1] }}
              style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 10, fontWeight: 600 }}>
                Today flow
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Dashboard UI Refactor · 2h left", tag: "Continue", active: true },
                  { label: "API Permission Layer review", tag: "Review", active: false },
                  { label: "Sprint planning · 15:00", tag: "Upcoming", active: false },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: "grid", gridTemplateColumns: "18px 1fr auto", gap: 10, alignItems: "center",
                    background: row.active ? "rgba(249,115,22,0.10)" : "var(--surface-2)",
                    border: row.active ? "1px solid rgba(249,115,22,0.20)" : "1px solid transparent",
                    padding: "10px 12px", borderRadius: 9, fontSize: 12,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 6, flexShrink: 0,
                      background: row.active ? "var(--warmth)" : "var(--surface-3)",
                    }} />
                    <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.label}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0 }}>{row.tag}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Journey Pulse card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.32, 0.72, 0.16, 1] }}
              style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}
            >
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 10, fontWeight: 600 }}>
                Journey pulse · this week
              </div>
              <div style={{ height: 56, position: "relative", overflow: "hidden" }}>
                <svg viewBox="0 0 400 56" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
                  <defs>
                    <linearGradient id="pulseG" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#FF6B5C"/>
                      <stop offset="0.5" stopColor="#F97316"/>
                      <stop offset="1" stopColor="#F5A524"/>
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,40 L40,32 L80,36 L120,28 L160,30 L200,20 L240,22 L280,12 L320,16 L360,8 L400,12"
                    fill="none" stroke="url(#pulseG)" strokeWidth="2"
                  />
                </svg>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}
