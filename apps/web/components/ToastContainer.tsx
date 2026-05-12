"use client";

import { useToastStore } from "@/hooks/useToast";

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={[
            "pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer select-none",
            "animate-fade-in",
            t.variant === "error"
              ? "bg-red-600 text-white"
              : "bg-green-600 text-white",
          ].join(" ")}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
