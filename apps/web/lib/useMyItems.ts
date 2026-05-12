"use client";

import { useState, useEffect } from "react";
import { meApi, getToken, type ApiMyItem } from "./api";

export function useMyItems() {
  const [items, setItems]     = useState<ApiMyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    meApi.items()
      .then(setItems)
      .catch(err => console.error("Failed to load my items", err))
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
