import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { Maximize2, X } from 'lucide-react';
import { ds } from '@/app/theme/theme';
import { formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { useRunSession } from '../runSession';

/** Compact bar while a backup runs (or waits) with the dialog minimized. */
export function ActiveRunBar() {
  const { t } = useT();
  const {
    active,
    expanded,
    stage,
    queue,
    index,
    progress,
    result,
    error,
    setExpanded,
    cancelBackup,
    dismiss,
  } = useRunSession();

  if (!active || expanded) {
    return null;
  }

  const job = queue[index];
  const remaining = Math.max(0, queue.length - index - 1);
  const total = progress?.totalActions ?? 0;
  const done = progress?.doneActions ?? 0;
  const value = total > 0 ? (done / total) * 100 : stage === 'running' ? undefined : 100;
  const title = job ? fmt(t.run.backupNamed, { name: job.name }) : t.run.runJobs;
  const detail =
    stage === 'running'
      ? (progress?.currentPath ??
        (progress?.bytesTotal
          ? fmt(t.run.ofBytes, {
              done: formatBytes(progress.bytesDone),
              total: formatBytes(progress.bytesTotal),
            })
          : t.run.copying))
      : stage === 'loading'
        ? t.common.loadingPlan
        : stage === 'plan'
          ? t.run.waitingConfirm
          : stage === 'done'
            ? result?.phase === 'cancelled'
              ? t.run.cancelled
              : t.run.finished
            : (error ?? t.run.failed);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={(theme) => ({
        position: 'fixed',
        left: 112,
        right: 16,
        bottom: 16,
        zIndex: theme.zIndex.snackbar,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        px: 2,
        py: 1.5,
        borderRadius: '20px',
        bgcolor: ds(theme).surface,
        boxShadow: ds(theme).shadowRaised,
        border: `1px solid ${ds(theme).outline}`,
        maxWidth: 720,
        ml: 'auto',
        mr: 'auto',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {title}
            {remaining > 0 ? ` · +${remaining}` : ''}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {detail}
          </Typography>
        </Box>
        {(stage === 'running' || stage === 'loading') && (
          <Button size="small" color="inherit" onClick={cancelBackup}>
            {t.run.cancelRun}
          </Button>
        )}
        <IconButton size="small" aria-label={t.run.expand} onClick={() => setExpanded(true)}>
          <Maximize2 size={18} />
        </IconButton>
        {stage !== 'running' && stage !== 'loading' && (
          <IconButton size="small" aria-label={t.common.close} onClick={dismiss}>
            <X size={18} />
          </IconButton>
        )}
      </Box>
      {(stage === 'running' || stage === 'loading') && (
        <LinearProgress
          variant={value === undefined ? 'indeterminate' : 'determinate'}
          value={value ?? 0}
        />
      )}
    </Box>
  );
}
