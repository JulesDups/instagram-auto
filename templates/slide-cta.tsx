import type { Slide, Theme } from "@/lib/content";
import { themeLabel } from "@/lib/content";
import { EmphasizedText } from "./emphasized-text";

const COLOR_TEXT = "#1C343A";
const COLOR_BG = "#FBFAF8";
const COLOR_ACCENT = "#D4A374";

interface Props {
  slide: Slide;
  theme: Theme;
}

export function CtaSlide({ slide, theme }: Props) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: COLOR_TEXT,
        padding: 88,
        color: COLOR_BG,
        fontFamily: "Inter",
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
          fontSize={100}
          fontWeight={900}
          lineHeight={1.05}
          letterSpacing={-2}
          defaultColor={COLOR_BG}
          highlightColor={COLOR_ACCENT}
        />
        {slide.body && (
          <EmphasizedText
            text={slide.body}
            fontSize={38}
            fontWeight={400}
            lineHeight={1.4}
            defaultColor="rgba(251, 250, 248, 0.75)"
            highlightColor={COLOR_ACCENT}
          />
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 2,
            backgroundColor: COLOR_ACCENT,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 30,
            color: COLOR_BG,
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex" }}>@julesd.dev</div>
          <div style={{ display: "flex", color: COLOR_ACCENT }}>
            {slide.footer ?? "Follow for more"}
          </div>
        </div>
      </div>
    </div>
  );
}
