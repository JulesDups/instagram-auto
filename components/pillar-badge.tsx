import type { Theme } from "@/lib/content";
import { themeLabel } from "@/lib/content";

const STYLES: Record<Theme, string> = {
  "tech-decryption": "bg-[#1C343A]/10 text-[#1C343A] border-[#1C343A]/20",
  "build-in-public": "bg-[#D4A374]/15 text-[#8a6238] border-[#D4A374]/30",
  "human-pro": "bg-[#BF2C23]/10 text-[#BF2C23] border-[#BF2C23]/20",
};

export function PillarBadge({ theme }: { theme: Theme }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STYLES[theme]}`}
    >
      {themeLabel(theme)}
    </span>
  );
}
