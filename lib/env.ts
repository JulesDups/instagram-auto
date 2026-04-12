import "server-only";
import { z } from "zod";

const envSchema = z.object({
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: z.string().min(1),
  IG_BUSINESS_ACCOUNT_ID: z.string().regex(/^\d+$/),

  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().email(),
  EMAIL_TO: z.string().email(),

  INTAKE_SECRET: z.string().min(32),
  DRAFT_TOKEN_SECRET: z.string().min(32),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  PUBLIC_BASE_URL: z.string().url(),

  GITHUB_TOKEN: z.string().min(1),
  GITHUB_REPO: z
    .string()
    .regex(
      /^[\w.-]+\/[\w.-]+$/,
      "Format attendu : owner/repo (ex: JulesDups/instagram-auto)",
    ),
  GITHUB_WEBHOOK_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),

  DASHBOARD_PASSWORD: z.string().min(8, "Minimum 8 caractères"),
  DASHBOARD_COOKIE_SECRET: z
    .string()
    .regex(/^[a-f0-9]{64}$/, "Doit être 32 bytes hex (64 caractères hex)"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables. Check .env.local:\n${issues}`,
    );
  }
  cached = parsed.data;
  return cached;
}
