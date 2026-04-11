"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { PersistedDraft } from "@/lib/repos/drafts";
import type { Slide, SlideKind } from "@/lib/content";
import { saveDraftAction, rejectDraftAction } from "@/app/(dashboard)/preview/[draftId]/actions";
import { idleAction } from "@/lib/action-result";
import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/ui/form-field";
import { useToast } from "@/components/toast/toast-context";
import { useActionToast } from "@/components/toast/use-action-toast";
import { useEditSidebar } from "./edit-sidebar-context";

const SLIDE_KINDS: readonly { value: SlideKind; label: string }[] = [
  { value: "hook", label: "Hook" },
  { value: "content", label: "Content" },
  { value: "cta", label: "CTA" },
];

type LocalSlide = Slide & { uid: string };

function withUids(slides: Slide[]): LocalSlide[] {
  return slides.map((s) => ({ ...s, uid: crypto.randomUUID() }));
}

export function EditDraftForm({ draft }: { draft: PersistedDraft }) {
  const [state, formAction, isPending] = useActionState(
    saveDraftAction,
    idleAction,
  );
  const [slides, setSlides] = useState<LocalSlide[]>(() => withUids(draft.slides));
  const [rejecting, setRejecting] = useState(false);
  const { close } = useEditSidebar();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  useActionToast(state);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      close();
    }
  }, [state, close]);

  function updateSlide(uid: string, patch: Partial<Slide>) {
    setSlides((prev) =>
      prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)),
    );
  }

  function addSlide() {
    if (slides.length >= 10) {
      toast({
        kind: "warning",
        title: "Maximum 10 slides",
        description: "Un carousel Instagram ne peut pas dépasser 10 images.",
      });
      return;
    }
    setSlides((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        kind: "content",
        title: "",
        body: "",
        footer: "",
      },
    ]);
  }

  function removeSlide(uid: string) {
    if (slides.length <= 2) {
      toast({
        kind: "warning",
        title: "Minimum 2 slides",
        description: "Un carousel Instagram nécessite au moins 2 images.",
      });
      return;
    }
    setSlides((prev) => prev.filter((s) => s.uid !== uid));
  }

  async function handleReject() {
    setRejecting(true);
    const result = await rejectDraftAction(draft.id);
    if (!isMountedRef.current) return;
    setRejecting(false);
    if (result.status === "success") {
      toast({ kind: "info", title: "Draft rejeté" });
      close();
    } else {
      toast({ kind: "error", title: result.message });
    }
  }

  return (
    <form action={formAction} className="flex h-full flex-col">
      <input type="hidden" name="id" value={draft.id} />
      <input type="hidden" name="slide_count" value={slides.length} />

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <FormField label="Caption" htmlFor={`draft-caption-${draft.id}`}>
          <textarea
            id={`draft-caption-${draft.id}`}
            name="caption"
            defaultValue={draft.caption}
            maxLength={2200}
            rows={6}
            required
            className={textareaClass}
          />
        </FormField>

        <FormField
          label="Hashtags"
          htmlFor={`draft-hashtags-${draft.id}`}
          hint="Séparés par des espaces, le # est optionnel."
        >
          <input
            id={`draft-hashtags-${draft.id}`}
            name="hashtags"
            type="text"
            defaultValue={draft.hashtags.map((h) => `#${h}`).join(" ")}
            className={inputClass}
          />
        </FormField>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-hg-ink/60">
              Slides ({slides.length}/10)
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addSlide}
              disabled={isPending || slides.length >= 10}
            >
              + Ajouter une slide
            </Button>
          </div>

          <div className="space-y-4">
            {slides.map((slide, i) => (
              <div
                key={slide.uid}
                className="space-y-3 rounded-md border border-hg-ink/10 bg-white p-4"
              >
                <input
                  type="hidden"
                  name={`slide_${i}_kind`}
                  value={slide.kind}
                />
                <input
                  type="hidden"
                  name={`slide_${i}_title`}
                  value={slide.title}
                />
                <input
                  type="hidden"
                  name={`slide_${i}_body`}
                  value={slide.body ?? ""}
                />
                <input
                  type="hidden"
                  name={`slide_${i}_footer`}
                  value={slide.footer ?? ""}
                />

                <div className="flex items-center justify-between">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-hg-ink/50">
                    Slide {i + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={slide.kind}
                      onChange={(e) =>
                        updateSlide(slide.uid, {
                          kind: e.target.value as SlideKind,
                        })
                      }
                      className={`${selectClass} h-8 w-auto py-0 text-xs`}
                    >
                      {SLIDE_KINDS.map((k) => (
                        <option key={k.value} value={k.value}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.uid)}
                      disabled={isPending || slides.length <= 2}
                      className="rounded-md border border-hg-rust/25 px-2 py-1 text-[11px] font-medium text-hg-rust transition-colors duration-150 hover:bg-hg-rust/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Retirer
                    </button>
                  </div>
                </div>

                <FormField
                  label="Title"
                  htmlFor={`slide-${slide.uid}-title`}
                >
                  <input
                    id={`slide-${slide.uid}-title`}
                    type="text"
                    value={slide.title}
                    onChange={(e) =>
                      updateSlide(slide.uid, { title: e.target.value })
                    }
                    maxLength={140}
                    className={inputClass}
                  />
                </FormField>

                <FormField
                  label="Body (optionnel)"
                  htmlFor={`slide-${slide.uid}-body`}
                >
                  <textarea
                    id={`slide-${slide.uid}-body`}
                    value={slide.body ?? ""}
                    onChange={(e) =>
                      updateSlide(slide.uid, { body: e.target.value })
                    }
                    maxLength={320}
                    rows={3}
                    className={textareaClass}
                  />
                </FormField>

                <FormField
                  label="Footer (optionnel)"
                  htmlFor={`slide-${slide.uid}-footer`}
                >
                  <input
                    id={`slide-${slide.uid}-footer`}
                    type="text"
                    value={slide.footer ?? ""}
                    onChange={(e) =>
                      updateSlide(slide.uid, { footer: e.target.value })
                    }
                    maxLength={80}
                    className={inputClass}
                  />
                </FormField>
              </div>
            ))}
          </div>
        </div>

        {draft.status === "pending" && (
          <div className="pt-4">
            <Button
              type="button"
              variant="danger"
              onClick={handleReject}
              pending={rejecting}
              disabled={isPending}
              className="w-full"
            >
              Rejeter ce draft
            </Button>
          </div>
        )}
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
