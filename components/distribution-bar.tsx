import type { Theme } from "@/lib/content";
import { themeLabel } from "@/lib/content";

const COLORS: Record<Theme, string> = {
  "tech-decryption": "#1C343A",
  "build-in-public": "#D4A374",
  "human-pro": "#BF2C23",
};

interface Segment {
  theme: Theme;
  count: number;
  ratio?: number; // 0..1, optional override (defaults to count proportion)
  target?: number; // 0..1, optional target indicator
  withinTarget?: boolean;
}

interface Props {
  segments: Segment[];
  showLabels?: boolean;
  showTargets?: boolean;
}

export function DistributionBar({
  segments,
  showLabels = false,
  showTargets = false,
}: Props) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#1C343A]/5">
        {segments.map((s) => {
          const ratio =
            s.ratio !== undefined ? s.ratio : total === 0 ? 0 : s.count / total;
          if (ratio === 0) return null;
          return (
            <div
              key={s.theme}
              style={{
                width: `${ratio * 100}%`,
                backgroundColor: COLORS[s.theme],
              }}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          {segments.map((s) => {
            const ratio =
              s.ratio !== undefined
                ? s.ratio
                : total === 0
                  ? 0
                  : s.count / total;
            return (
              <div key={s.theme} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: COLORS[s.theme] }}
                  />
                  <span className="font-semibold text-[#1C343A]">
                    {themeLabel(s.theme)}
                  </span>
                  {showTargets && s.withinTarget !== undefined && (
                    <span
                      className={`ml-auto h-1.5 w-1.5 rounded-full ${
                        s.withinTarget ? "bg-emerald-500" : "bg-orange-400"
                      }`}
                    />
                  )}
                </div>
                <div className="text-[#1C343A]/60">
                  {s.count}
                  {showTargets && s.target !== undefined && (
                    <span className="ml-1 text-[#1C343A]/40">
                      ({(ratio * 100).toFixed(0)}% /{" "}
                      {(s.target * 100).toFixed(0)}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
