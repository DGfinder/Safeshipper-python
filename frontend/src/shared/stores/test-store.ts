import { create } from "zustand";

export const useTestStore = create(() => ({
  test: "hello"
}));