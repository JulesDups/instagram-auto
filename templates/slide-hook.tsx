import type { Slide, Theme } from "@/lib/content";
import { themeLabel } from "@/lib/content";
import { EmphasizedText } from "./emphasized-text";

const COLOR_TEXT = "#1C343A";
const COLOR_BG = "#FBFAF8";
const COLOR_ACCENT = "#D4A374";
const COLOR_HIGHLIGHT = "#BF2C23";

function titleFontSize(text: string): number {
  const len = text.replace(/\*\*/g, "").length;
  if (len <= 40) return 104;
  if (len <= 65) return 88;
  if (len <= 90) return 72;
  return 60;
}

interface Props {
  slide: Slide;
  theme: Theme;
}

export function HookSlide({ slide, theme }: Props) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: COLOR_BG,
        padding: 88,
        color: COLOR_TEXT,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          fontSize: 26,
          letterSpacing: 4,
          color: COLOR_ACCENT,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 48,
            height: 2,
            backgroundColor: COLOR_ACCENT,
          }}
        />
        <div style={{ display: "flex" }}>{themeLabel(theme)}</div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 36,
        }}
      >
        <EmphasizedText
          text={slide.title}
          fontSize={titleFontSize(slide.title)}
          fontWeight={800}
          lineHeight={1.05}
          letterSpacing={-2}
          defaultColor={COLOR_TEXT}
          highlightColor={COLOR_HIGHLIGHT}
        />
        {slide.body && (
          <EmphasizedText
            text={slide.body}
            fontSize={38}
            fontWeight={400}
            lineHeight={1.35}
            defaultColor="rgba(28, 52, 58, 0.65)"
            highlightColor={COLOR_HIGHLIGHT}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 28,
          color: "rgba(28, 52, 58, 0.55)",
          fontWeight: 500,
        }}
      >
        <div style={{ display: "flex" }}>@julesd.dev</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: COLOR_ACCENT,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex" }}>Swipe</div>
          <div style={{ display: "flex", fontSize: 36 }}>→</div>
        </div>
      </div>
    </div>
  );
}
