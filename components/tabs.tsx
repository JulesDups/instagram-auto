import Link from "next/link";

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  items: TabItem[];
  currentTab: string;
  basePath: string;
  extraQuery?: Record<string, string>;
}

export function Tabs({ items, currentTab, basePath, extraQuery = {} }: Props) {
  return (
    <div className="mb-6 flex gap-1 border-b border-[#1C343A]/10">
      {items.map((item, i) => {
        const active = item.key === currentTab;
        const href = (() => {
          const params = new URLSearchParams(extraQuery);
          if (i !== 0) params.set("tab", item.key);
          const qs = params.toString();
          return qs ? `${basePath}?${qs}` : basePath;
        })();
        return (
          <Link
            key={item.key}
            href={href}
            className={`relative -mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-[#D4A374] text-[#1C343A]"
                : "border-transparent text-[#1C343A]/50 hover:text-[#1C343A]/80"
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="ml-2 text-xs text-[#1C343A]/40">
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
