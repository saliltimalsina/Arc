"use client";

import OGSidebar from "@/components/OGSidebar";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { useAuthStore } from "@/lib/authStore";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <OGSidebar />
      <div style={{ flex: 1, padding: "24px 32px", maxWidth: 720 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 28 }}>Account, workspace, and session.</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.7 }}>Workspace</h2>
          <WorkspaceSwitcher />
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.7 }}>Account</h2>
          <div style={{ padding: 16, border: "1px solid rgba(0,0,0,0.08)", borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{user?.name ?? "—"}</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 2 }}>{user?.email ?? "—"}</div>
            {user && !user.emailVerified && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#F5A524" }}>Email not verified</div>
            )}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.7 }}>Session</h2>
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "8px 16px", background: "#F31260", color: "white",
              border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer",
            }}
          >
            Log out
          </button>
        </section>
      </div>
    </div>
  );
}
