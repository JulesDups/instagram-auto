"use client";

import { useActionState, useEffect } from "react";
import type { IdeaRow } from "@/lib/repos/ideas";
import { updateIdeaAction } from "@/app/(dashboard)/ideas/actions";
import { idleAction } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import { FormField, textareaClass } from "@/components/ui/form-field";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useEditSidebar } from "./edit-sidebar-context";

export function EditIdeaForm({ idea }: { idea: IdeaRow }) {
  const [state, formAction, isPending] = useActionState(
    updateIdeaAction,
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
      <input type="hidden" name="id" value={idea.id} />

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        <FormField label="Anecdote" htmlFor={`idea-text-${idea.id}`}>
          <textarea
            id={`idea-text-${idea.id}`}
            name="text"
            defaultValue={idea.text}
            maxLength={2000}
            rows={12}
            required
            className={textareaClass}
          />
        </FormField>

        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-hg-ink/10 bg-white px-3 py-2 text-sm text-hg-ink/80 transition-colors duration-150 hover:bg-hg-ink/5">
          <input
            type="checkbox"
            name="hardCta"
            defaultChecked={idea.hardCta}
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
