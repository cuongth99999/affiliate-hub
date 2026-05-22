import 'dotenv/config';
import { z } from 'zod';

/**
 * Validated environment variables for automation scripts.
 * Throws at startup if required vars are missing/invalid.
 *
 * Usage:
 *   import { env } from '@scripts/shared/env';
 *   const token = env.ACCESSTRADE_API_TOKEN;
 */
const schema = z.object({
  // Accesstrade
  ACCESSTRADE_API_TOKEN: z.string().min(1, 'ACCESSTRADE_API_TOKEN required'),
  ACCESSTRADE_PUBLISHER_ID: z.string().optional(),
  ACCESSTRADE_API_BASE: z.string().url().default('https://api.accesstrade.vn/v1'),

  // Anthropic / Claude
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY required'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().default(8000),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // Site
  SITE_URL: z.string().url().default('https://affiliate-hub.vn'),

  // Automation safety
  AUTO_DRAFT_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  AUTO_DRAFT_MAX_PER_RUN: z.coerce.number().int().positive().default(3),
  AUTO_DRAFT_MIN_PAYOUT_VND: z.coerce.number().int().positive().default(100000),
});

type EnvSchema = z.infer<typeof schema>;

let cached: EnvSchema | null = null;

export function loadEnv(): EnvSchema {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazy proxy — env validates only when first accessed.
 * Allows importing this module in files that don't need every var.
 */
export const env = new Proxy({} as EnvSchema, {
  get(_, prop: string) {
    return loadEnv()[prop as keyof EnvSchema];
  },
});
