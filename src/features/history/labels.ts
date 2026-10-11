import type { DesignTokens } from '@/app/theme/tokens';
import type { RunStatus, RunSummary } from '@/lib/bindings';
import type { Messages } from '@/lib/i18n';
import { fmt } from '@/lib/i18n';

export function statusLabels(t: Messages): Record<RunStatus, string> {
  return {
    done: t.status.done,
    cancelled: t.status.cancelled,
    failed: t.status.failed,
  };
}

export const statusTone: Record<RunStatus, keyof Pick<DesignTokens, 'mint' | 'lemon' | 'peach'>> = {
  done: 'mint',
  cancelled: 'lemon',
  failed: 'peach',
};

export function runCounts(run: RunSummary, t: Messages): string {
  const parts = [
    run.copied > 0 ? fmt(t.history.copied, { count: run.copied }) : null,
    run.updated > 0 ? fmt(t.history.updated, { count: run.updated }) : null,
    run.deleted > 0 ? fmt(t.history.deleted, { count: run.deleted }) : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) {
    return run.status === 'done' ? t.history.noChange : t.history.nothingCopied;
  }
  return parts.join(' · ');
}
