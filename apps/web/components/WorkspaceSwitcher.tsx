"use client";

import { useEffect, useRef, useState } from "react";
import { workspacesApi, type ApiWorkspace } from "@/lib/api";
import { pushToast } from "@/hooks/useToast";

export function WorkspaceSwitcher({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ApiWorkspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const list = await workspacesApi.listMine();
      setItems(list);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const current = items.find(w => w.isDefault) ?? items[0];

  const switchTo = async (id: string) => {
    try {
      await workspacesApi.setDefault(id);
      setItems(prev => prev.map(w => ({ ...w, isDefault: w.id === id })));
      setOpen(false);
      pushToast("Workspace switched", "success");
      // Reload to refresh scoped data
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: any) {
      pushToast(e?.message ?? "Failed to switch", "error");
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const ws = await workspacesApi.create(name);
      await workspacesApi.setDefault(ws.id);
      setNewName("");
      setCreating(false);
      setOpen(false);
      pushToast("Workspace created", "success");
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: any) {
      pushToast(e?.message ?? "Failed to create", "error");
    }
  };

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          width: "100%", padding: "8px 10px",
          background: "transparent", border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 8, cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
          {current?.name ?? "Workspace"}
        </span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute", left: 0, top: "calc(100% + 6px)", width: 240,
            background: "var(--bg-elevated, #fff)",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            borderRadius: 10, boxShadow: "0 12px 30px rgba(0,0,0,0.14)",
            zIndex: 1000, padding: 6,
          }}
        >
          {items.map(w => (
            <button
              key={w.id}
              type="button"
              onClick={() => switchTo(w.id)}
              style={{
                display: "flex", width: "100%", padding: "8px 10px",
                background: w.isDefault ? "rgba(51,142,247,0.10)" : "transparent",
                border: "none", borderRadius: 6, cursor: "pointer",
                fontSize: 13, alignItems: "center", gap: 8, textAlign: "left",
              }}
            >
              <span style={{ flex: 1 }}>{w.name}</span>
              {w.isDefault && <span style={{ fontSize: 10, opacity: 0.6 }}>current</span>}
            </button>
          ))}

          <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "6px 0" }} />

          {creating ? (
            <div style={{ display: "flex", gap: 6, padding: 4 }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") create(); if (e.key === "Escape") setCreating(false); }}
                placeholder="Workspace name"
                style={{ flex: 1, padding: "6px 8px", fontSize: 12, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 6 }}
              />
              <button type="button" onClick={create} style={{ padding: "4px 10px", fontSize: 12, background: "#338EF7", color: "white", border: "none", borderRadius: 6 }}>
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              style={{
                width: "100%", padding: "8px 10px", border: "none",
                background: "transparent", cursor: "pointer", textAlign: "left",
                fontSize: 13, color: "#338EF7",
              }}
            >
              + New workspace
            </button>
          )}
        </div>
      )}
    </div>
  );
}
