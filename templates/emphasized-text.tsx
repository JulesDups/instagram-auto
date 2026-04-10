import { parseEmphasis } from "@/lib/content";

interface Props {
  text: string;
  fontSize: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  defaultColor: string;
  highlightColor: string;
  wordGapRatio?: number;
}

export function EmphasizedText({
  text,
  fontSize,
  fontWeight = 400,
  lineHeight = 1.1,
  letterSpacing = 0,
  defaultColor,
  highlightColor,
  wordGapRatio = 0.25,
}: Props) {
  const segments = parseEmphasis(text);
  const columnGap = Math.round(fontSize * wordGapRatio);
  const rowGap = Math.round(fontSize * Math.max(lineHeight - 1, 0.05));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        fontSize,
        fontWeight,
        lineHeight,
        letterSpacing,
        columnGap,
        rowGap,
      }}
    >
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            color: seg.emphasized ? highlightColor : defaultColor,
          }}
        >
          {seg.text}
        </div>
      ))}
    </div>
  );
}
