"use client";

import { useActionState, useEffect } from "react";
import type { QueueItemRow } from "@/lib/repos/queue";
import type { Theme } from "@/lib/content";
import { updateQueueItemAction } from "@/app/(dashboard)/queue/actions";
import { idleAction } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/form-field";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useEditSidebar } from "./edit-sidebar-context";

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: "tech-decryption", label: "Décryptage tech" },
  { value: "build-in-public", label: "Build in public" },
  { value: "human-pro", label: "Humain pro" },
];

export function EditQueueItemForm({ item }: { item: QueueItemRow }) {
  const [state, formAction, isPending] = useActionState(
    updateQueueItemAction,
    idleAction,
  );
  const { close } = useEditSidebar();

  useActionToast(state);

  useEffect(() => {
    if (state.status === "success") {
      close();
    }
  }, [state, close]);

  return (
    <form action={formAction} className="flex h-full flex-col">
      <input type="hidden" name="id" value={item.id} />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <FormField label="Pilier" htmlFor={`queue-theme-${item.id}`}>
          <select
            id={`queue-theme-${item.id}`}
            name="theme"
            defaultValue={item.theme}
            className={selectClass}
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Angle du post" htmlFor={`queue-angle-${item.id}`}>
          <input
            id={`queue-angle-${item.id}`}
            name="angle"
            type="text"
            defaultValue={item.angle}
            maxLength={240}
            required
            className={inputClass}
          />
        </FormField>

        <FormField
          label="Notes (optionnel)"
          htmlFor={`queue-notes-${item.id}`}
          hint="Contexte pour ancrer le post, références, tone à tenir…"
        >
          <textarea
            id={`queue-notes-${item.id}`}
            name="notes"
            defaultValue={item.notes ?? ""}
            maxLength={800}
            rows={6}
            className={textareaClass}
          />
        </FormField>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-hg-ink/10 bg-white px-3 py-2 text-sm text-hg-ink/80 transition-colors duration-150 hover:bg-hg-ink/5">
          <input
            type="checkbox"
            name="cta"
            defaultChecked={item.cta}
            className="h-4 w-4 cursor-pointer accent-hg-gold"
          />
          CTA hard &mdash; &laquo;&nbsp;Travailler avec moi → bio&nbsp;&raquo;
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-hg-ink/8 bg-hg-cream px-6 py-4">
        <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" pending={isPending}>
          Sauvegarder
        </Button>
      </div>
    </form>
  );
}
