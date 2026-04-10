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
