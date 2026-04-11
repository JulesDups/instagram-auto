"use client";

import { useEffect, useRef } from "react";
import { useToast } from "./toast-context";
import type { ActionResult } from "@/lib/action-result";

/**
 * Fires a toast whenever an ActionResult changes.
 * Compare by createdAt so the same { status, message } repeated fires twice.
 */
export function useActionToast(state: ActionResult | null) {
  const { toast } = useToast();
  const lastAt = useRef<number | null>(null);

  useEffect(() => {
    if (!state) return;
    if (lastAt.current === state.at) return;
    lastAt.current = state.at;

    if (state.status === "success") {
      toast({ kind: "success", title: state.message });
    } else if (state.status === "error") {
      toast({ kind: "error", title: state.message });
    }
  }, [state, toast]);
}
