"use client";

import Link from "next/link";
import { Maximize2 } from "lucide-react";
import type { MouseEvent } from "react";
import type { PersistedDraft } from "@/lib/repos/drafts";
import { stripEmphasis } from "@/lib/content";
import { formatRelativeFrench } from "@/lib/format-date";
import { PillarBadge } from "./pillar-badge";
import { useLightbox } from "./lightbox/lightbox-context";

export function DraftCard({ draft }: { draft: PersistedDraft }) {
  const firstSlideTitle = stripEmphasis(draft.slides[0]?.title ?? draft.id);
  const statusLabel =
    draft.status === "published"
      ? { text: "Publié", color: "text-hg-moss" }
      : draft.status === "rejected"
        ? { text: "Rejeté", color: "text-hg-rust/75" }
        : { text: "En attente", color: "text-hg-ink/45" };

  const { open: openLightbox } = useLightbox();

  function handlePreview(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    openLightbox({
      draftId: draft.id,
      slideCount: draft.slides.length,
      initialIndex: 0,
    });
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-hg-ink/10 bg-white shadow-hg-sm transition-colors duration-150 hover:border-hg-gold/60 focus-within:border-hg-gold/60">
      <Link
        href={`/preview/${draft.id}`}
        aria-label={`Ouvrir le draft ${firstSlideTitle}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/render/${draft.id}/0`}
          alt={firstSlideTitle}
          width={1080}
          height={1080}
          className="aspect-square w-full object-cover"
        />
        <div className="space-y-2 border-t border-hg-ink/8 p-4">
          <div className="flex items-center justify-between">
            <PillarBadge theme={draft.theme} />
            <span
              className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${statusLabel.color}`}
            >
              {statusLabel.text}
            </span>
          </div>
          <div className="line-clamp-2 text-sm font-semibold text-hg-ink">
            {firstSlideTitle}
          </div>
          <div className="text-xs text-hg-ink/50">
            {draft.slides.length} slides ·{" "}
            {formatRelativeFrench(draft.publishedAt ?? draft.createdAt)}
          </div>
        </div>
      </Link>

      {/* Preview button sits as a sibling of the Link (not a descendant) to
          avoid nested-interactive-elements invalid HTML. z-10 floats it above. */}
      <button
        type="button"
        onClick={handlePreview}
        aria-label="Prévisualiser les slides"
        title="Prévisualiser les slides"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-hg-ink/80 text-hg-cream opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hg-gold"
      >
        <Maximize2 width={16} height={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
