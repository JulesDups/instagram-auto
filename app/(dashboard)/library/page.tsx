import { getDraftsWithStatus } from "@/lib/drafts";
import { Tabs } from "@/components/tabs";
import { DraftCard } from "@/components/draft-card";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; pillar?: string }>;
};

export default async function LibraryPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const currentTab =
    tab === "published" ? "published" : tab === "pending" ? "pending" : "all";

  const { items, manifestLoadFailed } = await getDraftsWithStatus();
  const allCount = items.length;
  const publishedCount = items.filter((i) => i.published !== null).length;
  const pendingCount = items.filter((i) => i.published === null).length;

  const visible =
    currentTab === "published"
      ? items.filter((i) => i.published !== null)
      : currentTab === "pending"
        ? items.filter((i) => i.published === null)
        : items;

  return (
    <div>
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          dashboard
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">Library</h1>
      </header>

      {manifestLoadFailed && (
        <div className="mb-6 rounded-lg border border-[#BF2C23]/30 bg-[#BF2C23]/5 px-4 py-3 text-sm text-[#BF2C23]">
          Manifest non chargé — les états &quot;publié&quot; peuvent être
          incomplets.
        </div>
      )}

      <Tabs
        items={[
          { key: "all", label: "Tous", count: allCount },
          { key: "pending", label: "À valider", count: pendingCount },
          { key: "published", label: "Publiés", count: publishedCount },
        ]}
        currentTab={currentTab}
        basePath="/library"
      />

      {visible.length === 0 ? (
        <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-8 text-center text-sm text-[#1C343A]/50">
          {currentTab === "published"
            ? "Aucun post publié pour l'instant."
            : currentTab === "pending"
              ? "Tous les drafts ont été publiés."
              : "Aucun draft pour le moment."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {visible.map((item) => (
            <DraftCard key={item.draft.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
