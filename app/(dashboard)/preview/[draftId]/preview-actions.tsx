"use client";

import { Maximize2, Pencil } from "lucide-react";
import type { PersistedDraft } from "@/lib/repos/drafts";
import { Button } from "@/components/ui/button";
import { useLightbox } from "@/components/lightbox/lightbox-context";
import { useEditSidebar } from "@/components/edit-sidebar/edit-sidebar-context";

export function PreviewSlideGrid({ draft }: { draft: PersistedDraft }) {
  const { open: openLightbox } = useLightbox();

  return (
    <div className="grid grid-cols-3 gap-4">
      {draft.slides.map((slide, i) => (
        <button
          key={i}
          type="button"
          onClick={() =>
            openLightbox({
              draftId: draft.id,
              slideCount: draft.slides.length,
              initialIndex: i,
            })
          }
          className="group overflow-hidden rounded-xl border border-hg-ink/10 bg-white text-left shadow-hg-sm transition-colors duration-150 hover:border-hg-gold/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/render/${draft.id}/${i}`}
              alt={`Slide ${i + 1}: ${slide.title}`}
              width={1080}
              height={1080}
              className="aspect-square w-full object-cover"
            />
            <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md bg-hg-ink/80 text-hg-cream opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <Maximize2 width={16} height={16} strokeWidth={2} aria-hidden="true" />
            </div>
          </div>
          <div className="border-t border-hg-ink/8 px-3 py-2 text-xs text-hg-ink/55">
            {i + 1}. {slide.kind}
          </div>
        </button>
      ))}
    </div>
  );
}

export function EditDraftButton({ draft }: { draft: PersistedDraft }) {
  const { open } = useEditSidebar();
  return (
    <Button
      type="button"
      variant="secondary"
      leadingIcon={<Pencil width={14} height={14} strokeWidth={2} aria-hidden="true" />}
      onClick={() => open({ kind: "draft", data: draft })}
    >
      Éditer le draft
    </Button>
  );
}
