import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { CircleAlert, FolderOpen, History } from 'lucide-react';
import { useMemo, useState } from 'react';
import { hoverLift, stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { modeLabels } from '@/features/jobs/labels';
import type { JobId, RunId, RunSummary } from '@/lib/bindings';
import { formatBytes, formatDuration, formatWhen } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { openRunLog, useRun, useRunLog, useRuns } from './api';
import { runCounts, statusLabels, statusTone } from './labels';
import { RunLogPanel } from './RunLogPanel';

export function HistoryPage() {
  const { t } = useT();
  const runs = useRuns();
  const items = runs.data ?? [];
  const [jobId, setJobId] = useState<JobId | null>(null);
  const [openId, setOpenId] = useState<RunId | null>(null);

  const jobs = useMemo(() => {
    const seen = new Map<JobId, string>();
    for (const run of items) {
      if (!seen.has(run.jobId)) {
        seen.set(run.jobId, run.jobName);
      }
    }
    return [...seen.entries()];
  }, [items]);

  const visible = jobId ? items.filter((run) => run.jobId === jobId) : items;

  return (
    <Page title={t.history.title} description={t.history.description}>
      {runs.isPending && <LinearProgress aria-label={t.common.loadingHistory} />}
      {runs.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => runs.refetch()}>
              {t.common.retry}
            </Button>
          }
        >
          {runs.error.message}
        </Alert>
      )}
      {runs.data &&
        (items.length === 0 ? (
          <EmptyState
            icon={<History size={32} />}
            title={t.history.emptyTitle}
            description={t.history.emptyDescription}
          />
        ) : (
          <>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              <Chip
                label={t.history.all}
                clickable
                variant={jobId === null ? 'filled' : 'outlined'}
                onClick={() => setJobId(null)}
              />
              {jobs.map(([id, name]) => (
                <Chip
                  key={id}
                  label={name}
                  clickable
                  variant={jobId === id ? 'filled' : 'outlined'}
                  onClick={() => setJobId(id)}
                />
              ))}
            </Box>
            <Box component="ul" sx={{ m: 0, p: 0, display: 'grid', gap: 1.5, ...stagger(50) }}>
              {visible.map((run) => (
                <RunRow key={run.id} run={run} onOpen={setOpenId} />
              ))}
            </Box>
          </>
        ))}
      <RunDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </Page>
  );
}

function RunRow({ run, onOpen }: { run: RunSummary; onOpen: (id: RunId) => void }) {
  const { t } = useT();
  const tone = statusTone[run.status];
  const status = statusLabels(t)[run.status];
  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(run.id)}
        aria-label={`${run.jobName}, ${status}, ${formatWhen(run.finishedAtMs)}`}
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          width: '100%',
          p: 2,
          border: 0,
          textAlign: 'left',
          cursor: 'pointer',
          borderRadius: '24px',
          bgcolor: ds(theme).surface,
          boxShadow: ds(theme).shadow,
          color: 'inherit',
          font: 'inherit',
          ...hoverLift(ds(theme).shadowRaised),
        })}
      >
        <Box
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            height: 32,
            px: 1.25,
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            bgcolor: ds(theme)[tone],
            color: ds(theme).onAccent,
            flexShrink: 0,
          })}
        >
          {status}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
            {run.jobName}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {modeLabels(t)[run.mode].title} · {runCounts(run, t)}
            {run.bytesCopied > 0 && ` · ${formatBytes(run.bytesCopied)}`}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {formatWhen(run.finishedAtMs)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDuration(run.startedAtMs, run.finishedAtMs)}
            {run.errorCount > 0 && ` · ${fmt(t.history.errorCount, { count: run.errorCount })}`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function RunDetailDialog({ id, onClose }: { id: RunId | null; onClose: () => void }) {
  const { t } = useT();
  const detail = useRun(id);
  const log = useRunLog(id);
  const run = detail.data?.run;

  return (
    <Dialog
      open={id !== null}
      onClose={onClose}
      maxWidth={false}
      scroll="paper"
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'min(100%, 96vw)', lg: 'min(1280px, 92vw)' },
            maxWidth: 'none',
            height: { xs: 'auto', md: 'min(880px, 88vh)' },
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.5, md: 4 }, pt: { xs: 2, md: 3 }, pb: 1 }}>
        <Typography variant="h2" component="span">
          {run ? run.jobName : t.history.runTitle}
        </Typography>
      </DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2.5, md: 4 },
          pb: { xs: 2, md: 3 },
        }}
      >
        {detail.isPending && <LinearProgress aria-label={t.common.loadingRun} />}
        {detail.isError && <Alert severity="error">{detail.error.message}</Alert>}
        {run && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 1fr) minmax(0, 1.65fr)' },
              gap: { xs: 2.5, md: 3 },
              pt: 1,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <Box
                sx={(theme) => ({
                  display: 'inline-flex',
                  alignSelf: 'flex-start',
                  alignItems: 'center',
                  height: 36,
                  px: 1.5,
                  borderRadius: '999px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  bgcolor: ds(theme)[statusTone[run.status]],
                  color: ds(theme).onAccent,
                })}
              >
                {statusLabels(t)[run.status]}
              </Box>
              <Box sx={{ display: 'grid', gap: 1 }}>
                <MetaLine label={t.history.detailMode} value={modeLabels(t)[run.mode].title} />
                <MetaLine label={t.history.detailWhen} value={formatWhen(run.finishedAtMs)} />
                <MetaLine
                  label={t.history.detailDuration}
                  value={formatDuration(run.startedAtMs, run.finishedAtMs)}
                />
              </Box>
              <Typography variant="body1" sx={{ fontSize: { md: '1.0625rem' }, lineHeight: 1.5 }}>
                {runCounts(run, t)}
                {run.bytesCopied > 0 ? ` · ${formatBytes(run.bytesCopied)}` : ''}
                {run.dirsCreated > 0 ? ` · ${fmt(t.history.dirs, { count: run.dirsCreated })}` : ''}
              </Typography>
              {detail.data && detail.data.errors.length > 0 && (
                <Box
                  sx={(theme) => ({
                    p: 2,
                    borderRadius: '20px',
                    bgcolor: ds(theme).muted,
                    maxHeight: { xs: 200, lg: '40vh' },
                    overflow: 'auto',
                  })}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CircleAlert size={18} />
                    <Typography variant="subtitle2" component="p">
                      {t.history.errors}
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {detail.data.errors.map((message) => (
                      <Typography
                        key={message}
                        component="li"
                        variant="body2"
                        sx={{ fontSize: { md: '0.9375rem' }, py: 0.25 }}
                      >
                        {message}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>

            <Box
              sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, flex: 1 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="subtitle2" component="p">
                  {t.history.log}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FolderOpen size={16} />}
                  disabled={log.isPending || log.data === null || id === null}
                  onClick={() => {
                    if (id === null) {
                      return;
                    }
                    void openRunLog(id).catch((err: unknown) => {
                      window.alert(err instanceof Error ? err.message : t.history.openReportFailed);
                    });
                  }}
                >
                  {t.history.openReportFolder}
                </Button>
              </Box>
              {log.data && id && <RunLogPanel key={id} text={log.data} />}
              {log.data === null && (
                <Typography variant="body2" color="text.secondary">
                  {t.history.logGone}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2.5, md: 4 }, pb: { xs: 2, md: 3 }, pt: 0 }}>
        <Button onClick={onClose} size="large">
          {t.common.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(7rem, 9rem) 1fr', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}
