"use client";

import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import type { Toast, ToastKind } from "./toast-context";
import { useToast } from "./toast-context";

const KIND_STYLES: Record<
  ToastKind,
  { accent: string; iconColor: string; iconBg: string }
> = {
  success: {
    accent: "border-l-hg-moss",
    iconColor: "text-hg-moss",
    iconBg: "bg-hg-moss/10",
  },
  error: {
    accent: "border-l-hg-rust",
    iconColor: "text-hg-rust",
    iconBg: "bg-hg-rust/10",
  },
  warning: {
    accent: "border-l-hg-gold",
    iconColor: "text-hg-gold",
    iconBg: "bg-hg-gold/15",
  },
  info: {
    accent: "border-l-hg-ink",
    iconColor: "text-hg-ink",
    iconBg: "bg-hg-ink/8",
  },
};

function KindIcon({ kind, className }: { kind: ToastKind; className?: string }) {
  const props = {
    width: 16,
    height: 16,
    strokeWidth: 2,
    className,
    "aria-hidden": true as const,
  };
  if (kind === "success") return <CheckCircle2 {...props} />;
  if (kind === "error") return <AlertCircle {...props} />;
  if (kind === "warning") return <AlertTriangle {...props} />;
  return <Info {...props} />;
}

export function ToastItem({ toast }: { toast: Toast }) {
  const { dismiss } = useToast();
  const styles = KIND_STYLES[toast.kind];

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      className={[
        "pointer-events-auto flex w-full max-w-sm items-start gap-3",
        "rounded-md border border-hg-ink/10 bg-hg-cream pl-3 pr-2 py-3",
        "shadow-[0_8px_24px_rgba(28,52,58,0.08)]",
        "border-l-[3px]",
        styles.accent,
      ].join(" ")}
      style={{ animation: "var(--animate-hg-toast-in)" }}
    >
      <div
        className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full ${styles.iconBg}`}
      >
        <KindIcon kind={toast.kind} className={styles.iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-hg-ink">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-hg-ink/65">
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismiss(toast.id);
            }}
            className="mt-2 rounded-sm text-xs font-semibold uppercase tracking-wider text-hg-gold transition-colors duration-150 hover:text-hg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Fermer"
        className="flex h-6 w-6 flex-none items-center justify-center rounded-md text-hg-ink/40 transition-colors duration-150 hover:bg-hg-ink/5 hover:text-hg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
      >
        <X width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
