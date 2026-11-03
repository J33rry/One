"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Favourite contacts are a per-device convenience with no server model, so
// they're kept in localStorage and keyed by user id.
export const useFavorites = create<{
  ids: string[];
  toggle: (userId: string) => void;
}>()(
  persist(
    (set) => ({
      ids: [],
      toggle: (userId) =>
        set((s) => ({
          ids: s.ids.includes(userId) ? s.ids.filter((id) => id !== userId) : [...s.ids, userId],
        })),
    }),
    { name: "pebble-favorites" },
  ),
);
