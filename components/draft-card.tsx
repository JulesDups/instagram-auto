import Link from "next/link";
import type { PersistedDraft } from "@/lib/repos/drafts";
import { stripEmphasis } from "@/lib/content";
import { formatRelativeFrench } from "@/lib/stats";
import { PillarBadge } from "./pillar-badge";

export function DraftCard({ draft }: { draft: PersistedDraft }) {
  const firstSlideTitle = stripEmphasis(draft.slides[0]?.title ?? draft.id);
  const statusLabel =
    draft.status === "published"
      ? { text: "Publié", color: "text-emerald-600" }
      : draft.status === "rejected"
        ? { text: "Rejeté", color: "text-[#BF2C23]/70" }
        : { text: "En attente", color: "text-[#1C343A]/40" };

  return (
    <Link
      href={`/preview/${draft.id}`}
      className="group block overflow-hidden rounded-xl border border-[#1C343A]/10 bg-white transition hover:border-[#D4A374]/60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/render/${draft.id}/0`}
        alt={firstSlideTitle}
        width={1080}
        height={1080}
        className="aspect-square w-full object-cover"
      />
      <div className="space-y-2 border-t border-[#1C343A]/10 p-4">
        <div className="flex items-center justify-between">
          <PillarBadge theme={draft.theme} />
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider ${statusLabel.color}`}
          >
            {statusLabel.text}
          </span>
        </div>
        <div className="line-clamp-2 text-sm font-semibold text-[#1C343A]">
          {firstSlideTitle}
        </div>
        <div className="text-xs text-[#1C343A]/50">
          {draft.slides.length} slides ·{" "}
          {formatRelativeFrench(draft.publishedAt ?? draft.createdAt)}
        </div>
      </div>
    </Link>
  );
}
