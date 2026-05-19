"use client";

import { useEffect, useState, useCallback } from "react";
import { projectsApi } from "@/lib/api";
import { pushToast } from "@/hooks/useToast";
import OGSidebar from "@/components/OGSidebar";

type Row = { id: string; name: string; emoji: string; color: string; key: string; deletedAt: string };

export default function TrashPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsApi.listTrash();
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const restore = async (id: string) => {
    try {
      await projectsApi.restore(id);
      setRows(prev => prev.filter(r => r.id !== id));
      pushToast("Project restored", "success");
    } catch (e: any) {
      pushToast(e?.message ?? "Failed to restore", "error");
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <OGSidebar />
      <div style={{ flex: 1, padding: "24px 32px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Archived</h1>
        <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 24 }}>Deleted projects. Restore to bring them back.</p>

        {loading && <div style={{ fontSize: 13, opacity: 0.7 }}>Loading…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 12, opacity: 0.7 }}>
            Trash is empty.
          </div>
        )}

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map(r => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>{r.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {r.key} · deleted {new Date(r.deletedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => restore(r.id)}
                style={{
                  padding: "6px 12px",
                  background: "#338EF7",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
