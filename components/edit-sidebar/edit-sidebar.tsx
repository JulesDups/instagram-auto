"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useEditSidebar } from "./edit-sidebar-context";
import { EditIdeaForm } from "./edit-idea-form";
import { EditQueueItemForm } from "./edit-queue-item-form";
import { EditDraftForm } from "./edit-draft-form";

const TITLES = {
  idea: "Éditer l'idée",
  queue: "Éditer le sujet",
  draft: "Éditer le draft",
} as const;

export function EditSidebar() {
  const { current, close, isOpen } = useEditSidebar();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // On open, move focus into the panel (close button) so keyboard users
  // land inside the "modal" rather than staying in the underlying page.
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen, current]);

  return (
    <aside
      // `inert` removes all descendants from focus order and AT when closed,
      // enforcing the aria-modal contract without conditional unmounting.
      inert={!isOpen}
      aria-hidden={!isOpen}
      role="dialog"
      aria-modal="true"
      aria-label={current ? TITLES[current.kind] : "Édition"}
      className={[
        "fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col",
        "border-l border-hg-ink/10 bg-hg-cream shadow-[-12px_0_40px_rgba(28,52,58,0.08)]",
        "transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      <header className="flex items-center justify-between border-b border-hg-ink/8 px-6 py-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-hg-gold">
            sidebar
          </div>
          <div className="mt-1 text-lg font-bold text-hg-ink">
            {current ? TITLES[current.kind] : "Édition"}
          </div>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={close}
          aria-label="Fermer"
          className="flex h-9 w-9 items-center justify-center rounded-md text-hg-ink/50 transition-colors duration-150 hover:bg-hg-ink/5 hover:text-hg-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
        >
          <X width={18} height={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        {current?.kind === "idea" && (
          <EditIdeaForm key={current.data.id} idea={current.data} />
        )}
        {current?.kind === "queue" && (
          <EditQueueItemForm key={current.data.id} item={current.data} />
        )}
        {current?.kind === "draft" && (
          <EditDraftForm key={current.data.id} draft={current.data} />
        )}
      </div>
    </aside>
  );
}
