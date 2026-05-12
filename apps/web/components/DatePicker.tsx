"use client";

import { useState, useRef, useEffect } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

interface DatePickerProps {
  value: string;       // ISO yyyy-mm-dd
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  triggerOpen?: number; // increment to force-open the picker
  align?: "left" | "right"; // which edge to anchor the popover to
  error?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = "Pick date", className = "", triggerOpen, align = "left", error }: DatePickerProps) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const selected = value ? new Date(value + "T00:00:00") : null;

  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear]  = useState((selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (triggerOpen) openPicker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerOpen]);

  function openPicker() {
    if (selected) { setViewYear(selected.getFullYear()); setViewMonth(selected.getMonth()); }
    else          { setViewYear(today.getFullYear());    setViewMonth(today.getMonth()); }
    setOpen(true);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function pickDay(d: Date) {
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    onChange(iso);
    setOpen(false);
  }

  function buildCells() {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const days  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = Array(first).fill(null);
    for (let i = 1; i <= days; i++) cells.push(new Date(viewYear, viewMonth, i));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  const displayLabel = selected
    ? selected.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : placeholder;

  const cells = buildCells();

  return (
    <div ref={ref} className={`dp-root ${className}`} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={"dp-trigger" + (open ? " dp-trigger-open" : "") + (selected ? "" : " dp-trigger-empty") + (error && !selected ? " dp-trigger-error" : "")}
        onClick={openPicker}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.6 }}>
          <rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/>
        </svg>
        <span>{displayLabel}</span>
      </button>

      {open && (
        <div className="dp-popover" style={align === "right" ? { left: "auto", right: 0 } : undefined}>
          {/* Header */}
          <div className="dp-head">
            <button className="dp-nav" onClick={prevMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span className="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
            <button className="dp-nav" onClick={nextMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          {/* Day-of-week row */}
          <div className="dp-dow-row">
            {DAYS.map(d => <span key={d} className="dp-dow">{d}</span>)}
          </div>

          {/* Day cells */}
          <div className="dp-grid">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isToday    = d.getTime() === today.getTime();
              const isSel      = selected && d.getTime() === selected.getTime();
              return (
                <button
                  key={i}
                  type="button"
                  className={"dp-day" + (isToday ? " dp-today" : "") + (isSel ? " dp-sel" : "")}
                  onClick={() => pickDay(d)}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="dp-foot">
            <button className="dp-today-btn" onClick={() => pickDay(today)}>Today</button>
            {selected && <button className="dp-clear-btn" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  );
}
