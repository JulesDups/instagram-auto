"use client";
import { useState } from "react";
import type { PersistedDraft } from "@/lib/repos/drafts";
import { saveDraftAction, rejectDraftAction } from "./actions";

export function EditForm({ draft }: { draft: PersistedDraft }) {
  const [slides, setSlides] = useState(
    JSON.stringify(draft.slides, null, 2),
  );

  return (
    <div className="space-y-6">
      <form
        action={saveDraftAction.bind(null, draft.id)}
        className="space-y-4 rounded-xl border border-[#1C343A]/10 bg-white p-4"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#1C343A]/50">
            Caption
          </label>
          <textarea
            name="caption"
            defaultValue={draft.caption}
            maxLength={2200}
            rows={5}
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#1C343A]/50">
            Hashtags (séparés par des espaces)
          </label>
          <input
            name="hashtags"
            defaultValue={draft.hashtags.map((h) => `#${h}`).join(" ")}
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#1C343A]/50">
            Slides (JSON — min 2, max 10)
          </label>
          <textarea
            name="slides"
            value={slides}
            onChange={(e) => setSlides(e.target.value)}
            rows={18}
            className="w-full rounded-md border border-[#1C343A]/20 px-3 py-2 font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-[#1C343A]/40">
            Chaque slide : <code>kind</code> (hook / content / cta),{" "}
            <code>title</code>, <code>body</code>, <code>footer</code>. Les
            champs <code>kind</code> et <code>theme</code> ne sont pas
            éditables — le pilier reste figé.
          </p>
        </div>
        <div className="flex justify-between">
          <button
            type="submit"
            className="rounded-md bg-[#1C343A] px-4 py-2 text-sm font-semibold text-[#FBFAF8]"
          >
            Sauvegarder
          </button>
        </div>
      </form>

      {draft.status === "pending" && (
        <form action={rejectDraftAction.bind(null, draft.id)}>
          <button
            type="submit"
            className="rounded-md border border-[#BF2C23]/30 px-4 py-2 text-sm font-semibold text-[#BF2C23]"
          >
            Rejeter ce draft
          </button>
        </form>
      )}
    </div>
  );
}
