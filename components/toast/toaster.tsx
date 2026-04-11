"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useToast } from "./toast-context";
import { ToastItem } from "./toast-item";

const emptySubscribe = () => () => {};
const getClient = () => true;
const getServer = () => false;

export function Toaster() {
  const { toasts } = useToast();
  const mounted = useSyncExternalStore(emptySubscribe, getClient, getServer);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-3"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body,
  );
}
