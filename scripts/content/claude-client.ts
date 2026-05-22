/**
 * Claude API client with prompt caching for content generation.
 *
 * Uses Anthropic SDK. The prompt template is cached (system block) so
 * subsequent calls for different products reuse the cached tokens — saves
 * ~50-70% on cost when generating multiple drafts in a batch.
 */
import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../shared/env';
import { createLogger } from '../shared/logger';

const log = createLogger('claude');

const PROMPTS_DIR = path.join(import.meta.dirname, 'prompt-templates');

let _client: Anthropic | null = null;

function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export type PromptName = 'review' | 'comparison' | 'product-yaml';

const PROMPT_CACHE: Map<PromptName, string> = new Map();

async function loadPrompt(name: PromptName): Promise<string> {
  const cached = PROMPT_CACHE.get(name);
  if (cached) return cached;
  const file = path.join(PROMPTS_DIR, `${name}.md`);
  const content = await readFile(file, 'utf-8');
  PROMPT_CACHE.set(name, content);
  return content;
}

/**
 * Render a Mustache-style {{var}} template with the given variables.
 * Missing vars are replaced with the empty string (with a warning).
 */
export function renderTemplate(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) {
      log.warn(`Missing template var: ${key}`);
      return '';
    }
    return String(vars[key]);
  });
}

export interface GenerateOptions {
  prompt: PromptName;
  variables: Record<string, string | number>;
  /** System prefix (prompt template) is automatically cached. */
  cacheSystem?: boolean;
  /** Override default model. */
  model?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    estimatedCostUsd: number;
  };
}

// Per-1M-token pricing for Claude Sonnet 4.6 (approximate, in USD).
// Update when Anthropic publishes new rates.
const PRICING = {
  inputPer1M: 3.0,
  outputPer1M: 15.0,
  cacheWritePer1M: 3.75, // 25% premium
  cacheReadPer1M: 0.3,   // 90% discount
};

function estimateCost(usage: GenerateResult['usage']): number {
  return (
    (usage.inputTokens * PRICING.inputPer1M) / 1_000_000 +
    (usage.outputTokens * PRICING.outputPer1M) / 1_000_000 +
    (usage.cacheCreationTokens * PRICING.cacheWritePer1M) / 1_000_000 +
    (usage.cacheReadTokens * PRICING.cacheReadPer1M) / 1_000_000
  );
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const template = await loadPrompt(options.prompt);
  const userPrompt = renderTemplate(template, options.variables);

  const model = options.model ?? env.ANTHROPIC_MODEL;
  const maxTokens = options.maxTokens ?? env.ANTHROPIC_MAX_TOKENS;

  log.info(`Generating with ${model}`, {
    prompt: options.prompt,
    cacheSystem: options.cacheSystem ?? true,
  });

  const systemBlocks: Anthropic.Messages.TextBlockParam[] = [
    {
      type: 'text',
      text: 'You are a Vietnamese personal finance content writer. Generate honest, fact-based content that follows Google E-E-A-T guidelines and avoids AI-generated content fingerprints.',
      ...(options.cacheSystem !== false ? { cache_control: { type: 'ephemeral' } } : {}),
    },
  ];

  const response = await client().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const rawUsage = response.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  const usage = {
    inputTokens: rawUsage.input_tokens,
    outputTokens: rawUsage.output_tokens,
    cacheCreationTokens: rawUsage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: rawUsage.cache_read_input_tokens ?? 0,
    estimatedCostUsd: 0,
  };
  usage.estimatedCostUsd = estimateCost(usage);

  log.success(`Generated ${usage.outputTokens} output tokens`, {
    cost: `$${usage.estimatedCostUsd.toFixed(4)}`,
    cacheRead: usage.cacheReadTokens,
  });

  return { text, usage };
}
