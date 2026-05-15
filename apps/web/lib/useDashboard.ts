"use client";

import { useEffect, useState } from "react";
import { meApi, getToken, type ApiDashboard } from "./api";

export function useDashboard() {
  const [data, setData]       = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    meApi.dashboard()
      .then(setData)
      .catch(err => console.error("Failed to load dashboard", err))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
