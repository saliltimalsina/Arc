export default function DashboardLoading() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Sidebar skeleton */}
      <div style={{
        width: 72, borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "20px 0", gap: 14, flexShrink: 0,
      }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
          ))}
        </div>
      </div>

      {/* Main area skeleton */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <div style={{
          height: 56, borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", padding: "0 24px", gap: 12,
        }}>
          <div className="skeleton" style={{ width: 160, height: 20, borderRadius: 6 }} />
          <div style={{ flex: 1 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="skeleton" style={{ width: 240, height: 28, borderRadius: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />
            ))}
          </div>
          <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
        </div>
      </div>
    </div>
  );
}
