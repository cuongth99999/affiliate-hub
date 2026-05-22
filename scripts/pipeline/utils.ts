import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');

/**
 * Convert Vietnamese text to URL-safe slug. Mirror of src/lib/slugify.ts
 * (re-implemented here to avoid coupling automation scripts to src/).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function repoRoot(): string {
  return REPO_ROOT;
}

export function repoPath(...segments: string[]): string {
  return path.join(REPO_ROOT, ...segments);
}

export function fileExists(p: string): boolean {
  return existsSync(p);
}

export async function readJsonSafe<T>(p: string, fallback: T): Promise<T> {
  if (!existsSync(p)) return fallback;
  const raw = await readFile(p, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function writeJson(p: string, data: unknown): Promise<void> {
  await writeFile(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ─── Git helpers ───────────────────────────────────────────────────────────

export function git(...args: string[]): string {
  return execSync(`git ${args.map((a) => JSON.stringify(a)).join(' ')}`, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
  }).trim();
}

export function gitCurrentBranch(): string {
  return git('rev-parse', '--abbrev-ref', 'HEAD');
}

export function gitCheckoutBranch(name: string, fromBranch = 'main'): void {
  try {
    git('checkout', '-b', name, fromBranch);
  } catch {
    git('checkout', name);
  }
}

export function gitAdd(paths: string[]): void {
  git('add', ...paths);
}

export function gitHasChanges(): boolean {
  const status = git('status', '--porcelain');
  return status.length > 0;
}

export function gitCommit(message: string): void {
  if (!gitHasChanges()) return;
  git('commit', '-m', message);
}

export function gitPush(branch: string): void {
  git('push', '-u', 'origin', branch);
}

// ─── Date helpers ──────────────────────────────────────────────────────────

export function isoDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0]!;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}
