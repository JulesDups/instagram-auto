"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { QueueItemRow } from "@/lib/repos/queue";
import type { Theme } from "@/lib/content";
import { idleAction } from "@/lib/action-result";
import {
  createQueueItemAction,
  deleteQueueItemAction,
  reorderQueueAction,
} from "./actions";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/form-field";
import { SortableList } from "@/components/dnd/sortable-list";
import { DragHandle } from "@/components/dnd/drag-handle";
import { PillarBadge } from "@/components/pillar-badge";
import { useToast } from "@/components/toast/toast-context";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useEditSidebar } from "@/components/edit-sidebar/edit-sidebar-context";

const UNDO_WINDOW_MS = 5000;

const THEMES: readonly { value: Theme; label: string }[] = [
  { value: "tech-decryption", label: "Décryptage tech" },
  { value: "build-in-public", label: "Build in public" },
  { value: "human-pro", label: "Humain pro" },
];

type Props = {
  initialQueue: QueueItemRow[];
};

export function QueueList({ initialQueue }: Props) {
  const [items, setItems] = useState<QueueItemRow[]>(initialQueue);
  const [, startTransition] = useTransition();
  const [createState, createFormAction, isCreating] = useActionState(
    createQueueItemAction,
    idleAction,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  // Undo-delete timers (5s window). Intentionally NOT cleaned up on unmount:
  // if the user navigates away during the window, the setTimeout dies with the
  // component and the Server Action is never fired — this is the desired
  // cancel-on-navigate semantics. Do NOT add a useEffect cleanup here.
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // See IdeasList for the rationale behind these refs.
  const pendingDeleteIds = useRef(new Set<string>());
  const reorderInFlight = useRef(0);
  const lastStableItems = useRef<QueueItemRow[]>(initialQueue);
  const { toast } = useToast();
  const { open: openEdit } = useEditSidebar();

  useActionToast(createState);

  useEffect(() => {
    if (reorderInFlight.current > 0) return;
    const filtered = initialQueue.filter(
      (i) => !pendingDeleteIds.current.has(i.id),
    );
    setItems(filtered);
    lastStableItems.current = filtered;
  }, [initialQueue]);

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
          .filter((v): v is QueueItemRow => Boolean(v));
      });
      reorderInFlight.current += 1;
      startTransition(async () => {
        const result = await reorderQueueAction(orderedIds);
        reorderInFlight.current -= 1;
        if (result.status === "error") {
          toast({ kind: "error", title: result.message });
          setItems(lastStableItems.current);
        } else {
          const map = new Map(lastStableItems.current.map((i) => [i.id, i]));
          const committed = orderedIds
            .map((id) => map.get(id))
            .filter((v): v is QueueItemRow => Boolean(v));
          lastStableItems.current = committed;
        }
      });
    },
    [toast],
  );

  const handleDelete = useCallback(
    (item: QueueItemRow) => {
      pendingDeleteIds.current.add(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));

      const timer = setTimeout(async () => {
        deleteTimers.current.delete(item.id);
        const result = await deleteQueueItemAction(item.id);
        if (result.status === "error") {
          toast({ kind: "error", title: result.message });
          setItems((prev) => {
            if (prev.some((i) => i.id === item.id)) return prev;
            return [...prev, item].sort((a, b) => a.position - b.position);
          });
        }
        pendingDeleteIds.current.delete(item.id);
      }, UNDO_WINDOW_MS);
      deleteTimers.current.set(item.id, timer);

      toast({
        kind: "warning",
        title: "Sujet supprimé",
        description: "Annule avant 5 secondes pour le restaurer.",
        duration: UNDO_WINDOW_MS,
        action: {
          label: "Annuler",
          onClick: () => {
            const t = deleteTimers.current.get(item.id);
            if (t) clearTimeout(t);
            deleteTimers.current.delete(item.id);
            pendingDeleteIds.current.delete(item.id);
            setItems((prev) => {
              if (prev.some((i) => i.id === item.id)) return prev;
              return [...prev, item].sort((a, b) => a.position - b.position);
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
          Ajouter un sujet
        </h2>
        <form
          ref={formRef}
          action={createFormAction}
          className="space-y-3 rounded-lg border border-hg-ink/10 bg-white p-4 shadow-hg-sm"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <FormField label="Pilier">
              <select name="theme" required defaultValue="tech-decryption" className={selectClass}>
                {THEMES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </FormField>
            <label className="mt-6 inline-flex cursor-pointer items-center gap-2 self-start text-sm text-hg-ink/70">
              <input
                type="checkbox"
                name="cta"
                className="h-4 w-4 cursor-pointer accent-hg-gold"
              />
              CTA hard
            </label>
          </div>
          <FormField label="Angle du post">
            <input
              name="angle"
              required
              maxLength={240}
              placeholder="Ex: pourquoi useEffect est un piège…"
              className={inputClass}
            />
          </FormField>
          <FormField label="Notes (optionnel)">
            <textarea
              name="notes"
              maxLength={800}
              rows={2}
              placeholder="Contexte, références, ancrages perso…"
              className={textareaClass}
            />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" pending={isCreating}>
              Ajouter à la queue
            </Button>
          </div>
        </form>
      </section>

      <section className="mb-16">
        <h2 className="mb-4 font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
          Up next
        </h2>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-hg-ink/15 bg-white/50 px-4 py-8 text-center text-sm text-hg-ink/50">
            Queue vide. Le prochain run piochera un thème sous-représenté.
          </p>
        ) : (
          <div className="space-y-3">
            <SortableList
              items={items}
              onReorder={handleReorder}
              renderItem={(item, { isDragging, dragHandleProps }) => (
                <div
                  className={[
                    "flex items-start gap-3 rounded-lg border bg-white p-4 shadow-hg-sm transition-colors duration-150",
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
                    <div className="flex items-center gap-2">
                      <PillarBadge theme={item.theme} />
                      {item.cta && (
                        <span className="inline-flex items-center rounded-full bg-hg-rust/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-hg-rust">
                          CTA hard
                        </span>
                      )}
                    </div>
                    <div className="mt-2 font-medium text-hg-ink">{item.angle}</div>
                    {item.notes && (
                      <div className="mt-1 text-sm text-hg-ink/55">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-none items-center gap-1">
                    <IconButton
                      label="Éditer"
                      icon={<Pencil width={15} height={15} strokeWidth={2} aria-hidden="true" />}
                      size="sm"
                      onClick={() => openEdit({ kind: "queue", data: item })}
                    />
                    <IconButton
                      label="Supprimer"
                      icon={<Trash2 width={15} height={15} strokeWidth={2} aria-hidden="true" />}
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(item)}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}
      </section>
    </div>
  );
}
