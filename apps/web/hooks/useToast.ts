"use client";

import { useState, useEffect, useCallback } from "react";

export type ToastVariant = "success" | "error";
interface Toast { id: number; message: string; variant: ToastVariant; }

let _listeners: Array<(t: Toast) => void> = [];
let _nextId = 0;

export function pushToast(message: string, variant: ToastVariant = "success") {
  const t: Toast = { id: _nextId++, message, variant };
  _listeners.forEach(fn => fn(t));
}

export function useToastStore() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const fn = (t: Toast) => {
      setToasts(p => [...p, t]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3000);
    };
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts(p => p.filter(x => x.id !== id));
  }, []);

  return { toasts, dismiss };
}
