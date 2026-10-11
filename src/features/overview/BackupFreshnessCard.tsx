import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Clock3 } from 'lucide-react';
import { enter, hoverLift } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { DesignTokens } from '@/app/theme/tokens';
import { statusTone } from '@/features/history/labels';
import { formatWhen } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import type { FreshnessLevel, JobFreshnessRow } from './freshness';

const levelTone: Record<
  FreshnessLevel,
  keyof Pick<DesignTokens, 'mint' | 'lemon' | 'peach' | 'muted' | 'lilac'>
> = {
  fresh: 'mint',
  aging: 'lemon',
  stale: 'lilac',
  never: 'muted',
  failed: 'peach',
  cancelled: 'lemon',
};

export function BackupFreshnessCard({ rows }: { rows: JobFreshnessRow[] }) {
  const { t } = useT();

  if (rows.length === 0) {
    return null;
  }

  return (
    <Box
      component="section"
      aria-label={t.overview.freshnessTitle}
      sx={(theme) => ({
        p: 3,
        borderRadius: '28px',
        bgcolor: ds(theme).surface,
        boxShadow: ds(theme).shadow,
        ...hoverLift(ds(theme).shadowRaised),
        ...enter(100),
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
        <Box
          sx={(theme) => ({
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: ds(theme).muted,
          })}
        >
          <Clock3 size={20} />
        </Box>
        <Box>
          <Typography variant="h3" component="h2">
            {t.overview.freshnessTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t.overview.freshnessHint}
          </Typography>
        </Box>
      </Box>

      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          mt: 2,
          '& th': {
            textAlign: 'left',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: 'text.secondary',
            pb: 1,
            pr: 2,
            borderBottom: 1,
            borderColor: 'divider',
          },
          '& td': {
            py: 1.25,
            pr: 2,
            verticalAlign: 'middle',
            borderBottom: 1,
            borderColor: 'divider',
          },
          '& tr:last-of-type td': { borderBottom: 0 },
        }}
      >
        <thead>
          <tr>
            <th scope="col">{t.overview.freshnessColJob}</th>
            <th scope="col">{t.overview.freshnessColTarget}</th>
            <th scope="col">{t.overview.freshnessColLast}</th>
            <th scope="col">{t.overview.freshnessColAge}</th>
            <th scope="col" aria-label={t.overview.freshnessColRecent}>
              {t.overview.freshnessColRecent}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <FreshnessTableRow key={row.view.job.id} row={row} />
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

function FreshnessTableRow({ row }: { row: JobFreshnessRow }) {
  const { t } = useT();
  const { view, lastRun, level, daysSince, recentRuns } = row;
  const tone = levelTone[level];

  const ageLabel = (() => {
    switch (level) {
      case 'never':
        return t.overview.freshnessNever;
      case 'fresh':
        return t.overview.freshnessFresh;
      case 'aging':
        return fmt(t.overview.freshnessAging, { days: daysSince ?? 0 });
      case 'stale':
        return fmt(t.overview.freshnessStale, { days: daysSince ?? 0 });
      case 'failed':
        return t.overview.freshnessFailed;
      case 'cancelled':
        return t.overview.freshnessCancelled;
    }
  })();

  return (
    <tr>
      <td>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {view.job.name}
        </Typography>
      </td>
      <td>
        <Typography variant="body2" color="text.secondary" noWrap>
          {view.target.volumeName}
        </Typography>
      </td>
      <td>
        <Typography variant="body2" color="text.secondary" noWrap>
          {lastRun ? formatWhen(lastRun.finishedAtMs) : '—'}
        </Typography>
      </td>
      <td>
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            height: 28,
            px: 1.25,
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            bgcolor: ds(theme)[tone],
            color: tone === 'muted' ? ds(theme).inkMuted : ds(theme).onAccent,
            whiteSpace: 'nowrap',
          })}
        >
          {ageLabel}
        </Box>
      </td>
      <td>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {recentRuns.length === 0 ? (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          ) : (
            recentRuns.map((dot) => (
              <Box
                key={dot.id}
                sx={(theme) => ({
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: ds(theme)[statusTone[dot.status]],
                  flexShrink: 0,
                })}
              />
            ))
          )}
        </Box>
      </td>
    </tr>
  );
}
