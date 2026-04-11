"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/overview", label: "Overview" },
  { href: "/queue", label: "Queue" },
  { href: "/ideas", label: "Idées" },
  { href: "/library", label: "Library" },
] as const;

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-[#1C343A]/10 bg-[#FBFAF8] px-6 py-8">
      <div className="mb-12">
        <div className="text-[10px] uppercase tracking-widest text-[#D4A374]">
          instagram-auto
        </div>
        <div className="mt-1 text-lg font-bold text-[#1C343A]">@julesd.dev</div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/queue" && pathname.startsWith("/preview"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#1C343A] text-[#FBFAF8]"
                  : "text-[#1C343A] hover:bg-[#1C343A]/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="w-full rounded-lg border border-[#1C343A]/15 px-4 py-2 text-xs font-medium text-[#1C343A]/70 transition hover:bg-[#1C343A]/5 hover:text-[#1C343A]"
        >
          Logout
        </button>
      </form>
    </aside>
  );
}
