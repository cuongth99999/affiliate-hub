/**
 * Telegram message formatters for automation events.
 * Output is Markdown (Telegram parse_mode=Markdown).
 */
import type { DraftResult } from '../content/draft-post';
import type { ConversionSyncResult } from '../accesstrade/sync-conversions';

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

function escapeMd(text: string): string {
  // Telegram Markdown — escape minimal set: _ * ` [
  return text.replace(/([_*`\[])/g, '\\$1');
}

export function formatWeeklyDraftMessage(opts: {
  drafts: DraftResult[];
  prUrl?: string;
  date: string;
  totalCostUsd: number;
}): string {
  const lines: string[] = [];
  lines.push(`🤖 *Auto-draft tuần ${opts.date}*`);
  lines.push('');

  if (opts.drafts.length === 0) {
    lines.push('Không có hot campaign nào cần draft tuần này.');
    return lines.join('\n');
  }

  lines.push(`📝 *${opts.drafts.length} drafts mới cần review:*`);
  lines.push('');

  opts.drafts.forEach((d, i) => {
    const status = d.validation.ok ? '✓' : '⚠';
    lines.push(`${i + 1}. ${status} \`${escapeMd(d.slug)}\``);
    lines.push(`   📂 ${d.cluster} · ${escapeMd(d.filePath)}`);
    if (d.validation.warnings.length > 0) {
      lines.push(`   ⚠ ${d.validation.warnings.length} warning(s)`);
    }
  });

  lines.push('');
  lines.push(`💰 *Cost*: $${opts.totalCostUsd.toFixed(2)} (Claude API)`);

  if (opts.prUrl) {
    lines.push('');
    lines.push(`🔗 *Review PR*: ${opts.prUrl}`);
  }

  lines.push('');
  lines.push('*Checklist mỗi bài:*');
  lines.push('- Đọc draft, sửa chỗ AI bịa');
  lines.push('- Thay `[SCREENSHOT_NEEDED]` bằng ảnh thật');
  lines.push('- Set `draft: false`');
  lines.push('- Merge PR');

  return lines.join('\n');
}

export function formatWeeklyStatsMessage(opts: {
  syncResult: ConversionSyncResult;
  weekStart: string;
  weekEnd: string;
}): string {
  const lines: string[] = [];
  lines.push(`📊 *Weekly Stats* (${opts.weekStart} → ${opts.weekEnd})`);
  lines.push('');

  const { totalConversions, totalCommissionVnd, byStatus } = opts.syncResult;

  if (totalConversions === 0) {
    lines.push('Chưa có conversion nào trong tuần này.');
    return lines.join('\n');
  }

  lines.push(`✓ *Tổng conversions*: ${totalConversions}`);
  lines.push(`💰 *Tổng commission*: ${formatVnd(totalCommissionVnd)} VND`);
  lines.push('');
  lines.push('*Theo trạng thái:*');
  for (const [status, count] of Object.entries(byStatus)) {
    lines.push(`  • ${status}: ${count}`);
  }

  return lines.join('\n');
}

export function formatErrorMessage(scope: string, error: Error): string {
  return [
    `❌ *Automation error* — \`${escapeMd(scope)}\``,
    '',
    '```',
    error.message.slice(0, 500),
    '```',
  ].join('\n');
}
