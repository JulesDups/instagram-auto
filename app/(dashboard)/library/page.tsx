import { listDrafts } from "@/lib/repos/drafts";
import { Tabs } from "@/components/tabs";
import { DraftCard } from "@/components/draft-card";
import { PillarBadge } from "@/components/pillar-badge";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; pillar?: string }>;
};

type Tab = "all" | "pending" | "published" | "rejected";

export default async function LibraryPage({ searchParams }: Props) {
  const { tab, pillar } = await searchParams;
  const currentTab: Tab =
    tab === "published"
      ? "published"
      : tab === "pending"
        ? "pending"
        : tab === "rejected"
          ? "rejected"
          : "all";
  const currentPillar =
    pillar === "tech-decryption" ||
    pillar === "build-in-public" ||
    pillar === "human-pro"
      ? pillar
      : null;

  // Fetch all drafts in parallel for accurate tab counts.
  const [all, pending, published, rejected] = await Promise.all([
    listDrafts({}),
    listDrafts({ status: "pending" }),
    listDrafts({ status: "published" }),
    listDrafts({ status: "rejected" }),
  ]);

  const source =
    currentTab === "published"
      ? published
      : currentTab === "pending"
        ? pending
        : currentTab === "rejected"
          ? rejected
          : all;

  const filtered = currentPillar
    ? source.filter((d) => d.theme === currentPillar)
    : source;

  return (
    <div>
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-[#D4A374]">
          dashboard
        </div>
        <h1 className="mt-2 text-3xl font-bold text-[#1C343A]">Library</h1>
      </header>

      <Tabs
        items={[
          { key: "all", label: "Tous", count: all.length },
          { key: "pending", label: "À valider", count: pending.length },
          { key: "published", label: "Publiés", count: published.length },
          { key: "rejected", label: "Rejetés", count: rejected.length },
        ]}
        currentTab={currentTab}
        basePath="/library"
        extraQuery={currentPillar ? { pillar: currentPillar } : {}}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["tech-decryption", "build-in-public", "human-pro"] as const).map((theme) => {
          const active = currentPillar === theme;
          const params = new URLSearchParams();
          if (currentTab !== "all") params.set("tab", currentTab);
          if (!active) params.set("pillar", theme);
          const href = `/library${params.toString() ? `?${params.toString()}` : ""}`;
          return (
            <a
              key={theme}
              href={href}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-[#D4A374] bg-[#D4A374]/10 text-[#1C343A]"
                  : "border-[#1C343A]/10 bg-white text-[#1C343A]/60 hover:border-[#D4A374]/40"
              }`}
            >
              <PillarBadge theme={theme} />
            </a>
          );
        })}
        {currentPillar && (
          <a
            href={`/library${currentTab !== "all" ? `?tab=${currentTab}` : ""}`}
            className="rounded-full border border-[#1C343A]/10 bg-white px-3 py-1 text-xs font-medium text-[#1C343A]/50 hover:text-[#1C343A]/80"
          >
            Tous les piliers ×
          </a>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-[#1C343A]/10 bg-white px-4 py-8 text-center text-sm text-[#1C343A]/50">
          {currentTab === "published"
            ? "Aucun post publié pour l'instant."
            : currentTab === "pending"
              ? "Aucun draft en attente."
              : currentTab === "rejected"
                ? "Aucun draft rejeté."
                : "Aucun draft pour le moment."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {filtered.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}
