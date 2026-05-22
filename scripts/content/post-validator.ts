/**
 * Validate generated MDX before committing.
 *
 * Checks:
 *   1. Has frontmatter delimited by ---
 *   2. Frontmatter parses as YAML
 *   3. Required fields present (title, description, cluster, type, author, date)
 *   4. title length <= 80
 *   5. description length 80-170
 *   6. draft: true (auto-generated must default to draft)
 *   7. No AI fingerprint phrases in body
 */
import yaml from 'js-yaml';

const AI_FINGERPRINTS = [
  'Trong bối cảnh',
  'Đáng chú ý là',
  'Bên cạnh đó',
  'Hơn nữa',
  'Tuy nhiên cần lưu ý rằng',
  'Có thể nói rằng',
  'Trong thời đại hiện nay',
  'Với sự phát triển của',
];

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  frontmatter?: Record<string, unknown>;
}

export function validatePostMdx(mdx: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Match frontmatter
  const fmMatch = mdx.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { ok: false, errors: ['Missing or malformed frontmatter (---)'], warnings };
  }

  const [, fmText, body] = fmMatch;
  let fm: Record<string, unknown>;
  try {
    fm = yaml.load(fmText!) as Record<string, unknown>;
  } catch (err) {
    return { ok: false, errors: [`Frontmatter YAML parse error: ${(err as Error).message}`], warnings };
  }

  const required = ['title', 'description', 'cluster', 'type', 'author', 'date'];
  for (const field of required) {
    if (!fm[field]) errors.push(`Missing required field: ${field}`);
  }

  if (typeof fm.title === 'string' && fm.title.length > 80) {
    errors.push(`Title too long: ${fm.title.length} chars (max 80)`);
  }

  if (typeof fm.description === 'string') {
    const len = fm.description.length;
    if (len < 80) errors.push(`Description too short: ${len} chars (min 80)`);
    if (len > 170) errors.push(`Description too long: ${len} chars (max 170)`);
  }

  if (fm.draft !== true) {
    warnings.push('draft: should be true for auto-generated posts');
  }

  // Body length check
  const bodyText = body ?? '';
  if (bodyText.length < 500) {
    errors.push(`Body too short: ${bodyText.length} chars (min 500)`);
  }

  // AI fingerprint check
  for (const phrase of AI_FINGERPRINTS) {
    if (bodyText.includes(phrase)) {
      warnings.push(`AI fingerprint phrase detected: "${phrase}"`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    frontmatter: fm,
  };
}
