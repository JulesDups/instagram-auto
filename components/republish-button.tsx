"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/toast-context";
import { resetToPendingAction } from "@/app/(dashboard)/preview/[draftId]/actions";

export function RepublishButton({ draftId }: { draftId: string }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleClick() {
    if (loading) return;
    if (
      !confirm(
        "Remettre ce draft en attente ? Le post Instagram a déjà été supprimé.",
      )
    )
      return;
    setLoading(true);
    try {
      const result = await resetToPendingAction(draftId);
      if (result.status === "success") {
        toast({ kind: "success", title: "Draft remis en attente" });
        router.refresh();
      } else {
        toast({ kind: "error", title: "Erreur", description: result.message });
      }
    } catch {
      toast({ kind: "error", title: "Erreur réseau", description: "Réessaie." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" pending={loading} onClick={handleClick}>
      {loading ? "Réinitialisation…" : "Republier"}
    </Button>
  );
}
