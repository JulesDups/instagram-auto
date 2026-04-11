"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/toast-context";

export function PublishButton({ draftId }: { draftId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard-publish/${draftId}`, {
        method: "POST",
      });
      if (res.ok || res.status === 409) {
        toast({
          kind: "success",
          title: "Draft publié",
          description: "Rafraîchissement en cours…",
        });
        router.refresh();
        return;
      }
      const text = await res.text();
      const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      toast({
        kind: "error",
        title: "Publication échouée",
        description: plain.slice(0, 200),
        duration: 8000,
      });
    } catch {
      toast({
        kind: "error",
        title: "Erreur réseau",
        description: "Vérifie ta connexion et réessaie.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Button type="submit" variant="primary" pending={loading}>
        {loading ? "Publication en cours…" : "Publier sur Instagram"}
      </Button>
    </form>
  );
}
