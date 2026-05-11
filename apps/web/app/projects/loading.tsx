export default function ProjectsLoading() {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* Icon rail */}
      <div style={{
        width: 72, borderRight: "1px solid var(--line)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "20px 0", gap: 14, flexShrink: 0,
      }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
        ))}
      </div>

      {/* Project nav */}
      <div style={{
        width: 220, borderRight: "1px solid var(--line)",
        padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12, flexShrink: 0,
      }}>
        <div className="skeleton" style={{ width: "80%", height: 18, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: "60%", height: 14, borderRadius: 6 }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ width: "90%", height: 32, borderRadius: 8 }} />
        ))}
      </div>

      {/* Workspace */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 56, borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", padding: "0 24px", gap: 8 }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 80, height: 30, borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ flex: 1, padding: 32, display: "flex", gap: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="skeleton" style={{ height: 90, borderRadius: 10 }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
