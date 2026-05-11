"use client";

import { useState } from "react";
import { motion } from "framer-motion";

/* ── Icons ── */
export const IconSun = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
);
export const IconMoon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
export const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

/* ── Logo ── */
export function Logo() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontWeight: 600, letterSpacing: "-0.02em", fontSize: 16 }}>
      <span style={{
        width: 30, height: 30, borderRadius: 9,
        background: "var(--warmth)",
        display: "grid", placeItems: "center",
        color: "white", fontWeight: 800, fontSize: 13,
        boxShadow: "var(--shadow-logo)",
      }}>M</span>
      Mantra
    </div>
  );
}

/* ── Theme switch pill ── */
export function ThemeSwitch({ theme, onToggle }: { theme: string; onToggle: () => void }) {
  const isDark = theme === "dark";
  return (
    <button onClick={onToggle} title={isDark ? "Switch to light" : "Switch to dark"}
      style={{ height: 40, padding: 0, display: "inline-flex", alignItems: "center", background: "transparent", border: 0, cursor: "pointer" }}
    >
      <span style={{
        position: "relative", width: 64, height: 32, borderRadius: 999,
        background: "var(--surface)", border: "1px solid var(--line)",
        display: "flex", alignItems: "center",
        transition: "border-color .35s var(--ease)",
      }}>
        <span style={{
          position: "absolute", top: 3, left: 3,
          width: 26, height: 26, borderRadius: "50%",
          background: "var(--warmth)",
          display: "grid", placeItems: "center",
          color: "white",
          boxShadow: "var(--shadow-thumb)",
          transform: isDark ? "translateX(32px)" : "translateX(0px)",
          transition: "transform .4s var(--ease)",
          zIndex: 2,
        }}>
          {isDark ? <IconMoon /> : <IconSun />}
        </span>
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 32, display: "grid", placeItems: "center", color: "var(--text-4)", pointerEvents: "none", opacity: isDark ? 1 : 0, transition: "opacity .35s" }}>
          <IconSun />
        </span>
        <span style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 32, display: "grid", placeItems: "center", color: "var(--text-4)", pointerEvents: "none", opacity: isDark ? 0 : 1, transition: "opacity .35s" }}>
          <IconMoon />
        </span>
      </span>
    </button>
  );
}

/* ── Custom checkbox (white tick always) ── */
export function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span
      onClick={() => onChange(!checked)}
      style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
        background: checked ? "var(--warmth)" : "var(--surface)",
        border: checked ? "1.5px solid transparent" : "1.5px solid var(--line-strong)",
        display: "grid", placeItems: "center",
        transition: "background .2s, border-color .2s",
        cursor: "pointer",
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </span>
  );
}

/* ── Form field wrapper ── */
export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-3)", marginBottom: 8 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--red)" }}>{error}</p>}
    </div>
  );
}

/* ── Input style helpers ── */
export function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%", height: 48, padding: "0 16px", borderRadius: 12, fontSize: 14,
    background: "var(--surface)", border: `1px solid ${hasError ? "var(--red)" : "var(--line)"}`,
    color: "var(--text)", outline: "none", transition: "border-color .25s, box-shadow .25s",
  };
}
export function onFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "var(--focus-border)";
  e.currentTarget.style.boxShadow = "var(--focus-ring)";
}
export function onBlur(e: React.FocusEvent<HTMLInputElement>, hasError = false) {
  e.currentTarget.style.borderColor = hasError ? "var(--red)" : "var(--line)";
  e.currentTarget.style.boxShadow = "none";
}

/* ── Eye icons ── */
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/* ── Password input with eye toggle ── */
export function PasswordInput({
  value, onChange, placeholder = "••••••••••", hasError = false,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{ ...inputStyle(hasError), paddingRight: 44 }}
        onFocus={onFocus}
        onBlur={e => onBlur(e, hasError)}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-3)", display: "grid", placeItems: "center",
          padding: 2, transition: "color .2s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        tabIndex={-1}
      >
        {show ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}

/* ── CTA button ── */
export function CtaButton({ loading, label, icon }: { loading: boolean; label: string; icon?: React.ReactNode }) {
  return (
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
        opacity: loading ? 0.7 : 1, transition: "transform .15s, filter .25s",
      }}
      onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.filter = "brightness(1.05)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "none"; }}
      onMouseDown={e => { if (!loading) (e.currentTarget as HTMLElement).style.transform = "scale(0.99)"; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      {loading ? (
        <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
      ) : (<>{label}{icon}</>)}
    </button>
  );
}

/* ── Page shell (split layout) ── */
export function AuthShell({ theme, children }: { theme: string; children: React.ReactNode }) {
  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "Satoshi, -apple-system, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: "var(--ambient-main)" }} />
      <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1.05fr", minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}

/* ── Centered shell (for OTP, forgot) ── */
export function CenteredShell({ theme, children }: { theme: string; children: React.ReactNode }) {
  return (
    <div data-theme={theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "Satoshi, -apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "var(--ambient-main)" }} />
      <div style={{ position: "fixed", top: 24, left: 32 }}><Logo /></div>
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
        {children}
      </div>
    </div>
  );
}
