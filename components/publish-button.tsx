"use client";

import { useState } from "react";

export function PublishButton({ draftId }: { draftId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const form = e.currentTarget;
    try {
      const res = await fetch(form.action, { method: "POST" });
      const html = await res.text();
      document.open();
      document.write(html);
      document.close();
    } catch {
      setLoading(false);
    }
  }

  return (
    <form
      action={`/api/dashboard-publish/${draftId}`}
      method="POST"
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        disabled={loading}
        className={`rounded-lg px-4 py-2 text-sm font-semibold text-[#FBFAF8] transition ${
          loading
            ? "cursor-not-allowed bg-[#1C343A]/40"
            : "bg-[#1C343A] hover:bg-[#1C343A]/90"
        }`}
      >
        {loading ? "Publication en cours…" : "Publier sur Instagram"}
      </button>
    </form>
  );
}
