"use client";

import { useActionState, useCallback, useRef, useState, useTransition, useEffect } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { IdeaRow } from "@/lib/repos/ideas";
import { idleAction } from "@/lib/action-result";
import {
  createIdeaAction,
  deleteIdeaAction,
  reorderIdeasAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { FormField, textareaClass } from "@/components/ui/form-field";
import { SortableList } from "@/components/dnd/sortable-list";
import { DragHandle } from "@/components/dnd/drag-handle";
import { useToast } from "@/components/toast/toast-context";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useEditSidebar } from "@/components/edit-sidebar/edit-sidebar-context";

const UNDO_WINDOW_MS = 5000;

type Props = {
  initialPending: IdeaRow[];
  initialConsumed: IdeaRow[];
};

export function IdeasList({ initialPending, initialConsumed }: Props) {
  const [items, setItems] = useState<IdeaRow[]>(initialPending);
  const [, startTransition] = useTransition();
  const [createState, createFormAction, isCreating] = useActionState(
    createIdeaAction,
    idleAction,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  // Undo-delete timers (5s window). Intentionally NOT cleaned up on unmount:
  // if the user navigates away during the window, the setTimeout dies with the
  // component and the Server Action is never fired — this is the desired
  // cancel-on-navigate semantics. Do NOT add a useEffect cleanup here.
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Ids currently in a 5s undo window OR in a failed server delete.
  // Used to filter server-shipped `initialPending` so a concurrent
  // revalidation (e.g. from a create) doesn't resurrect an item mid-undo.
  const pendingDeleteIds = useRef(new Set<string>());
  // Counts in-flight reorder actions. While > 0 we skip the parent-sync
  // effect so a concurrent revalidation can't clobber the optimistic order.
  const reorderInFlight = useRef(0);
  // Last order known to be committed server-side — rollback target if a
  // reorder fails, instead of a stale closure snapshot.
  const lastStableItems = useRef<IdeaRow[]>(initialPending);
  const { toast } = useToast();
  const { open: openEdit } = useEditSidebar();

  useActionToast(createState);

  useEffect(() => {
    if (reorderInFlight.current > 0) return;
    const filtered = initialPending.filter(
      (i) => !pendingDeleteIds.current.has(i.id),
    );
    setItems(filtered);
    lastStableItems.current = filtered;
  }, [initialPending]);

  useEffect(() => {
    if (createState.status === "success") {
      formRef.current?.reset();
    }
  }, [createState]);

  const handleReorder = useCallback(
    (orderedIds: string[]) => {
      setItems((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        return orderedIds
          .map((id) => map.get(id))
          .filter((v): v is IdeaRow => Boolean(v));
      });
      reorderInFlight.current += 1;
      startTransition(async () => {
        const result = await reorderIdeasAction(orderedIds);
        reorderInFlight.current -= 1;
        if (result.status === "error") {
          toast({ kind: "error", title: result.message });
          setItems(lastStableItems.current);
        } else {
          // Commit: rebuild from ids against lastStableItems to keep metadata.
          const map = new Map(lastStableItems.current.map((i) => [i.id, i]));
          const committed = orderedIds
            .map((id) => map.get(id))
            .filter((v): v is IdeaRow => Boolean(v));
          lastStableItems.current = committed;
        }
      });
    },
    [toast],
  );

  const handleDelete = useCallback(
    (idea: IdeaRow) => {
      pendingDeleteIds.current.add(idea.id);
      setItems((prev) => prev.filter((i) => i.id !== idea.id));

      const timer = setTimeout(async () => {
        deleteTimers.current.delete(idea.id);
        const result = await deleteIdeaAction(idea.id);
        if (result.status === "error") {
          toast({ kind: "error", title: result.message });
          setItems((prev) => {
            if (prev.some((i) => i.id === idea.id)) return prev;
            return [...prev, idea].sort((a, b) => a.position - b.position);
          });
        }
        // On success OR error (after rollback) remove from pending set so
        // the sync effect picks up the new server state on next revalidation.
        pendingDeleteIds.current.delete(idea.id);
      }, UNDO_WINDOW_MS);
      deleteTimers.current.set(idea.id, timer);

      toast({
        kind: "warning",
        title: "Idée supprimée",
        description: "Annule avant 5 secondes pour la restaurer.",
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Annuler",
          onClick: () => {
            const t = deleteTimers.current.get(idea.id);
            if (t) clearTimeout(t);
            deleteTimers.current.delete(idea.id);
            pendingDeleteIds.current.delete(idea.id);
            setItems((prev) => {
              if (prev.some((i) => i.id === idea.id)) return prev;
              return [...prev, idea].sort((a, b) => a.position - b.position);
            });
            toast({ kind: "info", title: "Suppression annulée" });
          },
        },
      });
    },
    [toast],
  );

  return (
    <div>
      <section className="mb-12">
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
          Ajouter une anecdote
        </h2>
        <form
          ref={formRef}
          action={createFormAction}
          className="space-y-3 rounded-lg border border-hg-ink/10 bg-white p-4 shadow-hg-sm"
        >
          <FormField label="Anecdote">
            <textarea
              name="text"
              required
              maxLength={2000}
              rows={4}
              placeholder="L'anecdote brute, telle que tu la raconterais à un ami…"
              className={textareaClass}
            />
          </FormField>
          <div className="flex items-center justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-hg-ink/70">
              <input
                type="checkbox"
                name="hardCta"
                className="h-4 w-4 cursor-pointer accent-hg-gold"
              />
              CTA hard &mdash; &laquo;&nbsp;Travailler avec moi → bio&nbsp;&raquo;
            </label>
            <Button type="submit" variant="primary" pending={isCreating}>
              Ajouter
            </Button>
          </div>
        </form>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
          À transformer
        </h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hg-ink/15 bg-white/50 px-4 py-8 text-center text-sm text-hg-ink/50">
            Aucune anecdote en stock. Le cron retombera sur la queue puis le
            fallback si tu n&apos;en ajoutes pas.
          </p>
        ) : (
          <div className="space-y-3">
            <SortableList
              items={items}
              onReorder={handleReorder}
              renderItem={(idea, { isDragging, dragHandleProps }) => (
                <div
                  className={[
                    "flex items-start gap-2 rounded-lg border bg-white p-4 shadow-hg-sm transition-colors duration-150",
                    isDragging
                      ? "border-hg-gold/60 shadow-hg-md"
                      : "border-hg-ink/10 hover:border-hg-gold/40",
                  ].join(" ")}
                >
                  <DragHandle
                    ref={dragHandleProps.ref}
                    {...dragHandleProps.attributes}
                    {...dragHandleProps.listeners}
                  />
                  <div className="flex-1 min-w-0">
                    {idea.hardCta && (
                      <span className="mr-2 inline-flex items-center rounded-full bg-hg-rust/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-hg-rust">
                        CTA hard
                      </span>
                    )}
                    <div className="mt-1 whitespace-pre-wrap text-sm text-hg-ink">
                      {idea.text}
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <IconButton
                      label="Éditer"
                      icon={<Pencil width={15} height={15} strokeWidth={2} aria-hidden="true" />}
                      size="sm"
                      onClick={() => openEdit({ kind: "idea", data: idea })}
                    />
                    <IconButton
                      label="Supprimer"
                      icon={<Trash2 width={15} height={15} strokeWidth={2} aria-hidden="true" />}
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(idea)}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </section>

      {initialConsumed.length > 0 && (
        <section>
          <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
            Consommées
          </h2>
          <ul className="space-y-2">
            {initialConsumed.map((idea) => (
              <li
                key={idea.id}
                className="rounded-lg border border-hg-ink/8 bg-white/50 px-4 py-3 text-xs text-hg-ink/55"
              >
                {idea.hardCta && (
                  <span className="mr-2 inline-flex items-center rounded-full bg-hg-rust/10 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-hg-rust">
                    CTA
                  </span>
                )}
                <span className="whitespace-pre-wrap">{idea.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
