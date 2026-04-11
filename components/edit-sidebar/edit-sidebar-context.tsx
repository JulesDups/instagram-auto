"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { IdeaRow } from "@/lib/repos/ideas";
import type { QueueItemRow } from "@/lib/repos/queue";
import type { PersistedDraft } from "@/lib/repos/drafts";

/**
 * Snapshot pattern: `data` is captured at the moment `open()` is called and is
 * NOT automatically refreshed if the underlying row changes server-side while
 * the sidebar is open. This is acceptable because instagram-auto is a
 * single-user dashboard (see CLAUDE.md) — no concurrent editing is expected.
 * On successful Server Action submission, the form calls `close()`, which
 * unmounts the stale snapshot and prevents any visible divergence.
 */
export type EditTarget =
  | { kind: "idea"; data: IdeaRow }
  | { kind: "queue"; data: QueueItemRow }
  | { kind: "draft"; data: PersistedDraft };

type Ctx = {
  current: EditTarget | null;
  open: (target: EditTarget) => void;
  close: () => void;
  isOpen: boolean;
};

const EditSidebarContext = createContext<Ctx | null>(null);

export function EditSidebarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<EditTarget | null>(null);

  const open = useCallback((target: EditTarget) => {
    setCurrent(target);
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
  }, []);

  const isOpen = current !== null;

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const value = useMemo<Ctx>(
    () => ({ current, open, close, isOpen: current !== null }),
    [current, open, close],
  );

  return (
    <EditSidebarContext.Provider value={value}>
      {children}
    </EditSidebarContext.Provider>
  );
}

export function useEditSidebar(): Ctx {
  const ctx = useContext(EditSidebarContext);
  if (!ctx) {
    throw new Error("useEditSidebar must be used within a <EditSidebarProvider>");
  }
  return ctx;
}
