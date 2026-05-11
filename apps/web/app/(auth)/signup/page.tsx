"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  AuthShell, Logo, ThemeSwitch,
  Field, inputStyle, onFocus, onBlur,
  CustomCheckbox, CtaButton, PasswordInput,
} from "@/components/auth/shared";

export default function SignupPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark"|"light">("light");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (!agreed) e.agreed = "You must agree to continue";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.signup(form.name, form.email, form.password);
      sessionStorage.setItem("verify_email", res.email);
      router.push("/verify");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      setErrors({ email: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell theme={theme}>
      {/* Left: form */}
      <div className="auth-fade" style={{ padding: "56px 64px 48px", display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <ThemeSwitch theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              Already here?{" "}
              <Link href="/login" style={{ color: "var(--orange)", fontWeight: 600, borderBottom: "1.5px solid rgb(var(--orange-rgb) / 0.35)", paddingBottom: 1 }}>
                Sign in
              </Link>
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 380 }}>
          <div className="auth-fadein">
            <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.15, margin: "0 0 6px" }}>
              Start your{" "}
              <em style={{ fontStyle: "normal", background: "var(--warmth)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                journey
              </em>.
            </h1>
            <p style={{ color: "var(--text-3)", margin: "0 0 28px", fontSize: 14, lineHeight: 1.6 }}>
              Create your account and join your team on Mantra.
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Full name" error={errors.name}>
                <input type="text" value={form.name} onChange={set("name")} placeholder="Salil Timalsina"
                  style={inputStyle(!!errors.name)} onFocus={onFocus} onBlur={e => onBlur(e, !!errors.name)} />
              </Field>

              <Field label="Work email" error={errors.email}>
                <input type="email" value={form.email} onChange={set("email")} placeholder="you@company.com"
                  style={inputStyle(!!errors.email)} onFocus={onFocus} onBlur={e => onBlur(e, !!errors.email)} />
              </Field>

              <Field label="Password" error={errors.password}>
                <PasswordInput value={form.password} onChange={set("password")} placeholder="Min. 8 characters" hasError={!!errors.password} />
              </Field>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                <label style={{ display: "inline-flex", alignItems: "flex-start", gap: 9, cursor: "pointer", fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                  <CustomCheckbox checked={agreed} onChange={setAgreed} />
                  <span>
                    I agree to Mantra&apos;s{" "}
                    <a href="#" style={{ color: "var(--text-2)", borderBottom: "1px dashed var(--line-strong)" }}>Terms</a>
                    {" "}and{" "}
                    <a href="#" style={{ color: "var(--text-2)", borderBottom: "1px dashed var(--line-strong)" }}>Privacy Policy</a>
                  </span>
                </label>
                {errors.agreed && <p style={{ margin: 0, fontSize: 12, color: "var(--red)" }}>{errors.agreed}</p>}
              </div>

              <CtaButton loading={loading} label="Create account" />
            </form>
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-3)" }}>
          We&apos;ll send a 6-digit verification code after sign up.
        </p>
      </div>

      {/* Right: preview */}
      <div style={{
        background: "var(--bg-2)", borderLeft: "1px solid var(--line)",
        padding: 40, display: "flex", flexDirection: "column", gap: 18,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "var(--ambient-panel)" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { num: "01", title: "Your journey starts here", body: "Track contributions, milestones, and growth from day one." },
            { num: "02", title: "Work with your team", body: "Projects, tasks, and timelines — all in one place." },
            { num: "03", title: "Earn recognition", body: "Your work gets seen. Every milestone matters." },
          ].map((c, i) => (
            <div
              key={c.num}
              className="auth-fadescale"
              style={{
                background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 20px",
                animationDelay: `${0.05 + i * 0.07}s`,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--orange-2)", marginBottom: 6 }}>{c.num}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.55 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
