"use client";

import { useState } from "react";

export function PublishButton({ draftId }: { draftId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard-publish/${draftId}`, {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        window.location.reload();
        return;
      }
      const text = await res.text();
      // Extract text content from the HTML error page (strip tags)
      const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      setError(plain.slice(0, 200));
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    }
    setLoading(false);
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
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
      {error && (
        <p className="mt-2 text-xs text-[#BF2C23]">{error}</p>
      )}
    </div>
  );
}
