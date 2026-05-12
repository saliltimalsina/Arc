"use client";

import { useEffect } from "react";
import { ToastContainer } from "@/components/ToastContainer";
import { useAuthStore } from "@/lib/authStore";
import { useProjectStore } from "@/lib/projectStore";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAuthStore.getState().load();
    useProjectStore.getState().load();
  }, []);

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}
