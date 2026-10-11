import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { ChartNoAxesColumn, CopyCheck, FilePlus2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { ease, hoverLift, stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { DesignTokens } from '@/app/theme/tokens';
import { IconBubble } from '@/components/IconBubble';
import { SplitValue } from '@/components/SplitValue';
import { formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { type BackupStats, type DiskUsage, type OverviewStats, usedRatio } from './stats';

export function StatsCard({ stats, backups }: { stats: OverviewStats; backups: BackupStats }) {
  const { t } = useT();
  return (
    <Box
      component="article"
      aria-label={t.overview.stats}
      sx={(theme) => ({
        p: 3,
        borderRadius: '28px',
        bgcolor: ds(theme).surface,
        boxShadow: ds(theme).shadow,
        ...hoverLift(ds(theme).shadowRaised),
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconBubble tone="muted" size={40}>
          <ChartNoAxesColumn size={20} />
        </IconBubble>
        <Typography variant="h3" component="h3">
          {t.overview.stats}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 6fr)' },
          gap: { xs: 3, md: 5 },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 3,
            alignContent: 'start',
            ...stagger(60),
          }}
        >
          <Metric label={t.overview.capacity}>
            <SplitValue value={formatBytes(stats.totalBytes)} size={32} animate />
          </Metric>
          <Metric label={t.overview.freeConnected}>
            <SplitValue
              value={stats.freeBytes === null ? '—' : formatBytes(stats.freeBytes)}
              size={32}
              animate
            />
          </Metric>
          <Metric label={t.overview.jobsByMode}>
            <ModeCount
              icon={<FilePlus2 size={16} />}
              count={stats.modes.update}
              label={t.mode.update}
            />
            <ModeCount
              icon={<CopyCheck size={16} />}
              count={stats.modes.mirror}
              label={t.mode.mirror}
            />
          </Metric>
          <Metric label={t.overview.excludes}>
            <SplitValue value={String(stats.excludes)} size={32} animate />
          </Metric>
          <Metric label={t.overview.backupsInHistory}>
            <SplitValue value={String(backups.runCount)} size={32} animate />
          </Metric>
          <Metric label={t.overview.copiedTotal}>
            <SplitValue value={formatBytes(backups.bytesCopied)} size={32} animate />
          </Metric>
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t.overview.diskFill}
          </Typography>
          {stats.disks.length > 0 ? (
            <Box component="ul" sx={{ m: 0, p: 0, display: 'grid', gap: 2, ...stagger(60) }}>
              {stats.disks.map((disk) => (
                <DiskRow key={disk.id} disk={disk} />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t.overview.noDisks}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function ModeCount({ icon, count, label }: { icon: ReactNode; count: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', color: 'text.secondary' }}>{icon}</Box>
      <Typography variant="body1" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function barTone(ratio: number): keyof Pick<DesignTokens, 'mint' | 'lemon' | 'peach'> {
  if (ratio >= 0.9) {
    return 'peach';
  }
  return ratio >= 0.75 ? 'lemon' : 'mint';
}

function DiskRow({ disk }: { disk: DiskUsage }) {
  const { t } = useT();
  const ratio = usedRatio(disk);
  // A timer, not rAF: rAF pauses in hidden windows and the bar would stay empty.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setShown(ratio ?? 0), 30);
    return () => clearTimeout(timer);
  }, [ratio]);

  const detail =
    ratio === null
      ? `${disk.state === 'disconnected' ? t.overview.disconnected : t.overview.needsCheck} · ${formatBytes(disk.totalBytes)}`
      : `${Math.round(ratio * 100)} % · ${fmt(t.overview.freeOf, { free: formatBytes(disk.freeBytes ?? 0), total: formatBytes(disk.totalBytes) })}`;

  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.75 }}>
        <Typography variant="body1" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
          {disk.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {detail}
        </Typography>
      </Box>
      <Box
        role="meter"
        aria-label={fmt(t.overview.diskFillOf, { name: disk.name })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}
        aria-valuetext={detail}
        sx={(theme) => ({
          height: 8,
          borderRadius: '999px',
          overflow: 'hidden',
          bgcolor: ds(theme).muted,
          backgroundImage:
            ratio === null
              ? `repeating-linear-gradient(90deg, ${ds(theme).outline} 0 2px, transparent 2px 7px)`
              : 'none',
        })}
      >
        <Box
          sx={(theme) => ({
            height: '100%',
            borderRadius: '999px',
            width: `${shown * 100}%`,
            bgcolor: ds(theme)[barTone(ratio ?? 0)],
            transition: `width 900ms ${ease.emphasized} 200ms`,
          })}
        />
      </Box>
    </Box>
  );
}
