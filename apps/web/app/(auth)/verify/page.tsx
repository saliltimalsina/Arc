"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveToken } from "@/lib/api";
import { CenteredShell, ThemeSwitch } from "@/components/auth/shared";

export default function VerifyPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark"|"light">("light");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("verify_email") || "";
    setEmail(stored);
    inputs.current[0]?.focus();
  }, []);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length) {
      setOtp(prev => prev.map((_, i) => digits[i] || ""));
      inputs.current[Math.min(digits.length, 5)]?.focus();
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.join("").length < 6) { setError("Enter all 6 digits"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(email, otp.join(""));
      saveToken(res.access_token);
      sessionStorage.removeItem("verify_email");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await api.resendOtp(email);
      setResent(true);
      setTimeout(() => setResent(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend");
    }
  };

  const filled = otp.filter(Boolean).length;

  return (
    <CenteredShell theme={theme}>
      <div style={{ position: "fixed", top: 24, right: 24, zIndex: 10 }}>
        <ThemeSwitch theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      </div>

      <div className="auth-fadein">
        {/* Pulse dot */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "var(--orange-ping)",
              animation: "ping 1.8s ease-out infinite",
            }} />
            <div style={{
              position: "relative", width: 52, height: 52, borderRadius: "50%",
              background: "var(--warmth)",
              display: "grid", placeItems: "center",
              boxShadow: "var(--shadow-glow)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", margin: "0 0 8px" }}>
            Check your email
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
            We sent a 6-digit code to{" "}
            <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{email || "your email"}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* OTP inputs */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKey(i, e)}
                style={{
                  width: 52, height: 58, textAlign: "center",
                  fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em",
                  borderRadius: 14,
                  background: digit ? "var(--orange-subtle)" : "var(--surface)",
                  border: `1.5px solid ${digit ? "var(--focus-border)" : "var(--line)"}`,
                  color: "var(--text)", outline: "none",
                  transition: "border-color .2s, background .2s, box-shadow .2s",
                  caretColor: "var(--orange)",
                }}
                onFocus={e => { e.currentTarget.style.borderColor = "var(--focus-border)"; e.currentTarget.style.boxShadow = "var(--focus-ring)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = digit ? "var(--focus-border)" : "var(--line)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            ))}
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: "var(--surface-2)", borderRadius: 99, margin: "16px 0 4px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "var(--warmth)",
              width: `${(filled / 6) * 100}%`,
              transition: "width .2s var(--ease)",
            }} />
          </div>

          {error && <p style={{ textAlign: "center", fontSize: 12, color: "var(--red)", margin: "8px 0 0" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || filled < 6}
            style={{
              width: "100%", height: 48, marginTop: 20, borderRadius: 12,
              background: filled === 6 ? "var(--warmth)" : "var(--surface-2)",
              color: filled === 6 ? "white" : "var(--text-3)",
              fontSize: 14, fontWeight: 600,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: filled === 6 ? "var(--shadow-btn)" : "none",
              border: "none", cursor: filled < 6 ? "not-allowed" : "pointer",
              transition: "background .3s, color .3s, box-shadow .3s, transform .15s",
            }}
            onMouseEnter={e => { if (filled === 6 && !loading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; }}
          >
            {loading ? (
              <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
            ) : "Verify and continue"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-4)", marginTop: 20 }}>
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={handleResend}
            style={{ color: resent ? "var(--green)" : "var(--orange)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: 0 }}
          >
            {resent ? "Code sent ✓" : "Resend code"}
          </button>
          {" · "}
          <Link href="/login" style={{ color: "var(--text-3)" }}>Back to login</Link>
        </p>
      </div>

      <style>{`
        @keyframes ping { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.8);opacity:0} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </CenteredShell>
  );
}
