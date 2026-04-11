"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

export type LightboxTarget = {
  draftId: string;
  slideCount: number;
  initialIndex: number;
};

type Ctx = {
  current: LightboxTarget | null;
  open: (target: LightboxTarget) => void;
  close: () => void;
  isOpen: boolean;
};

const LightboxContext = createContext<Ctx | null>(null);

export function LightboxProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<LightboxTarget | null>(null);

  const open = useCallback((target: LightboxTarget) => {
    setCurrent({
      ...target,
      initialIndex: Math.max(0, Math.min(target.initialIndex, target.slideCount - 1)),
    });
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ current, open, close, isOpen: current !== null }),
    [current, open, close],
  );

  return (
    <LightboxContext.Provider value={value}>{children}</LightboxContext.Provider>
  );
}

export function useLightbox(): Ctx {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    throw new Error("useLightbox must be used within a <LightboxProvider>");
  }
  return ctx;
}
