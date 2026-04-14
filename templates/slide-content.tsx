import type { Slide, Theme } from "@/lib/content";
import { themeLabel } from "@/lib/content";
import { EmphasizedText } from "./emphasized-text";

const COLOR_TEXT = "#1C343A";
const COLOR_BG = "#FBFAF8";
const COLOR_ACCENT = "#D4A374";
const COLOR_HIGHLIGHT = "#BF2C23";

function titleFontSize(text: string): number {
  const len = text.replace(/\*\*/g, "").length;
  if (len <= 50) return 76;
  if (len <= 80) return 64;
  if (len <= 110) return 54;
  return 46;
}

interface Props {
  slide: Slide;
  theme: Theme;
  index: number;
  total: number;
}

export function ContentSlide({ slide, theme, index, total }: Props) {
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
          justifyContent: "space-between",
          fontSize: 24,
          color: COLOR_ACCENT,
          letterSpacing: 3,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 36,
              height: 2,
              backgroundColor: COLOR_ACCENT,
            }}
          />
          <div style={{ display: "flex" }}>{themeLabel(theme)}</div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "rgba(28, 52, 58, 0.5)",
            letterSpacing: 1,
          }}
        >
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 36,
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <EmphasizedText
          text={slide.title}
          fontSize={titleFontSize(slide.title)}
          fontWeight={800}
          lineHeight={1.1}
          letterSpacing={-1.5}
          defaultColor={COLOR_TEXT}
          highlightColor={COLOR_HIGHLIGHT}
        />
        {slide.body && (
          <EmphasizedText
            text={slide.body}
            fontSize={36}
            fontWeight={400}
            lineHeight={1.45}
            defaultColor="rgba(28, 52, 58, 0.72)"
            highlightColor={COLOR_HIGHLIGHT}
          />
        )}
      </div>

      {slide.footer ? (
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "rgba(28, 52, 58, 0.5)",
            fontStyle: "italic",
          }}
        >
          {slide.footer}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            width: 64,
            height: 2,
            backgroundColor: COLOR_ACCENT,
          }}
        />
      )}
    </div>
  );
}
