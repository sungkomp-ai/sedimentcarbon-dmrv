"use client";

import { create } from "zustand";

export type SectionId =
  | "dashboard"
  | "farms"
  | "samples"
  | "sediment"
  | "calculator"
  | "standards"
  | "audit"
  | "vvb"
  | "guide";

interface AppState {
  active: SectionId;
  selectedFarmId: string | null;
  setSection: (s: SectionId) => void;
  setSelectedFarmId: (id: string | null) => void;
}

export const useApp = create<AppState>((set) => ({
  active: "dashboard",
  selectedFarmId: null,
  setSection: (s) => set({ active: s }),
  setSelectedFarmId: (id) => set({ selectedFarmId: id }),
}));
