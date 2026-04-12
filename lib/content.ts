import { z } from "zod";

export const ThemeSchema = z.enum([
  "tech-decryption",
  "build-in-public",
  "human-pro",
]);
export type Theme = z.infer<typeof ThemeSchema>;

/**
 * Editorial pillars target distribution for Claude.ai task to respect over time:
 * - tech-decryption: 50%
 * - build-in-public: 30%
 * - human-pro: 20%
 * Rule: never two posts from the same pillar in a row.
 */
export const PILLAR_TARGET_DISTRIBUTION: Record<Theme, number> = {
  "tech-decryption": 0.5,
  "build-in-public": 0.3,
  "human-pro": 0.2,
};

export const SlideKindSchema = z.enum(["hook", "content", "cta"]);
export type SlideKind = z.infer<typeof SlideKindSchema>;

export const SlideSchema = z.object({
  kind: SlideKindSchema,
  title: z.string().min(1).max(140),
  body: z.string().max(320).optional(),
  footer: z.string().max(80).optional(),
});
export type Slide = z.infer<typeof SlideSchema>;

export const DraftSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9-]+$/, "id must be kebab-case lowercase alphanumeric"),
  createdAt: z.string().datetime(),
  theme: ThemeSchema,
  slides: z.array(SlideSchema).min(2).max(10),
  caption: z.string().min(1).max(2200),
  hashtags: z
    .array(z.string().regex(/^#?[\w-]+$/))
    .max(30)
    .default([]),
  /** Opaque ID of the source that was reserved by GET /api/next-source. */
  sourceId: z.string().optional(),
  /** Kind of the reserved source — used by POST /api/intake to commit consumed=true. */
  sourceKind: z.enum(["idea", "queue", "fallback"]).optional(),
});
export type Draft = z.infer<typeof DraftSchema>;

export function themeLabel(theme: Theme): string {
  switch (theme) {
    case "tech-decryption":
      return "DÉCRYPTAGE TECH";
    case "build-in-public":
      return "BUILD IN PUBLIC";
    case "human-pro":
      return "HUMAIN PRO";
  }
}

export function formatHashtags(hashtags: string[]): string {
  return hashtags
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
}

export function buildFullCaption(draft: Draft): string {
  const tags = formatHashtags(draft.hashtags);
  return tags ? `${draft.caption}\n\n${tags}` : draft.caption;
}

export interface TextSegment {
  text: string;
  emphasized: boolean;
}

export function parseEmphasis(input: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*([^*]+)\*\*|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      for (const word of match[1].split(/\s+/).filter(Boolean)) {
        segments.push({ text: word, emphasized: true });
      }
    } else if (match[2] !== undefined) {
      segments.push({ text: match[2], emphasized: false });
    }
  }
  return segments;
}

export function stripEmphasis(input: string): string {
  return input.replace(/\*\*([^*]+)\*\*/g, "$1");
}
