import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';
import type { PlanView, RunProgress, RunResult } from '@/lib/bindings';
import { formatBytes, formatEta, formatSpeed, runPace } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { modeLabels, unchangedFiles } from '../labels';
import { type RunQueueItem, useRunSession } from '../runSession';

export type { RunQueueItem };

/** Full run dialog driven by the app-wide run session (can be minimized). */
export function RunJobDialog() {
  const { t } = useT();
  const session = useRunSession();
  const {
    queue,
    skipped,
    index,
    stage,
    plan,
    confirmDelete,
    result,
    error,
    progress,
    expanded,
    active,
    setConfirmDelete,
    setExpanded,
    startBackup,
    cancelBackup,
    skipCurrent,
    goNext,
    dismiss,
  } = session;

  const current = queue[index];
  const remaining = queue.length - index - 1;
  const batch = queue.length > 1;
  const busy = stage === 'loading' || stage === 'running';
  const jobName = current?.name ?? '';
  const title = !current
    ? t.run.runJobs
    : batch
      ? `${index + 1} / ${queue.length} · ${jobName}`
      : stage === 'running' || stage === 'done'
        ? fmt(t.run.backupNamed, { name: jobName })
        : fmt(t.run.startNamed, { name: jobName });

  const open = active && expanded;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (busy) {
          setExpanded(false);
        } else {
          dismiss();
        }
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {batch && skipped > 0 && index === 0 && stage === 'plan' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {skipped === 1 ? t.run.skippedOne : fmt(t.run.skippedMany, { count: skipped })}
          </Alert>
        )}
        {stage === 'loading' && <LinearProgress aria-label={t.common.loadingPlan} />}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {stage === 'plan' && plan && (
          <PlanBody plan={plan} confirmDelete={confirmDelete} onConfirmDelete={setConfirmDelete} />
        )}
        {stage === 'running' && <ProgressBody progress={progress} />}
        {stage === 'done' && result && <ResultBody result={result} />}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {stage === 'plan' && (
          <>
            <Button onClick={dismiss}>{t.common.cancel}</Button>
            {remaining > 0 && (
              <Button color="inherit" onClick={skipCurrent}>
                {t.run.skip}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={startBackup}
              disabled={plan?.requiresDeleteConfirmation === true && !confirmDelete}
            >
              {remaining > 0 ? t.run.startContinue : t.run.start}
            </Button>
          </>
        )}
        {stage === 'running' && (
          <>
            <Button color="inherit" onClick={() => setExpanded(false)}>
              {t.run.minimize}
            </Button>
            <Button color="inherit" onClick={cancelBackup}>
              {t.run.cancelRun}
            </Button>
          </>
        )}
        {stage === 'loading' && (
          <Button color="inherit" onClick={() => setExpanded(false)}>
            {t.run.minimize}
          </Button>
        )}
        {stage === 'done' && remaining > 0 && result?.phase !== 'cancelled' && (
          <Button variant="contained" onClick={goNext}>
            {t.run.nextJob}
          </Button>
        )}
        {(stage === 'done' || stage === 'error') &&
          (remaining === 0 || result?.phase === 'cancelled') && (
            <Button variant="contained" onClick={dismiss}>
              {t.status.done}
            </Button>
          )}
        {stage === 'error' && remaining > 0 && (
          <>
            <Button onClick={dismiss}>{t.run.stop}</Button>
            <Button variant="contained" onClick={goNext}>
              {t.run.nextJob}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

function PlanBody({
  plan,
  confirmDelete,
  onConfirmDelete,
}: {
  plan: PlanView;
  confirmDelete: boolean;
  onConfirmDelete: (value: boolean) => void;
}) {
  const { t } = useT();
  const { summary } = plan;
  const kept = unchangedFiles(summary.sourceFiles, summary.copy, summary.update);
  const nothing = summary.copy + summary.update + summary.delete + summary.createDirs === 0;
  const modeTitle = modeLabels(t)[plan.mode].title;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {fmt(t.run.previewHint, { mode: modeTitle })}
      </Typography>
      {nothing ? (
        <Alert severity="success">{t.run.upToDate}</Alert>
      ) : (
        <Box
          component="ul"
          sx={{ m: 0, pl: 2.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {kept > 0 && <li>{fmt(t.run.willKeep, { count: kept })}</li>}
          {summary.copy > 0 && <li>{fmt(t.run.willCopy, { count: summary.copy })}</li>}
          {summary.update > 0 && <li>{fmt(t.run.willUpdate, { count: summary.update })}</li>}
          {summary.bytesToCopy > 0 && (
            <li>{fmt(t.run.willWrite, { bytes: formatBytes(summary.bytesToCopy) })}</li>
          )}
          {summary.createDirs > 0 && <li>{fmt(t.run.willDirs, { count: summary.createDirs })}</li>}
          {summary.delete > 0 && (
            <li>
              {fmt(t.run.willDelete, {
                count: summary.delete,
                bytes: formatBytes(summary.bytesToDelete),
              })}
            </li>
          )}
        </Box>
      )}
      {summary.delete > 0 && <Alert severity="warning">{t.run.mirrorWarn}</Alert>}
      {plan.requiresDeleteConfirmation && (
        <FormControlLabel
          control={
            <Checkbox checked={confirmDelete} onChange={(e) => onConfirmDelete(e.target.checked)} />
          }
          label={fmt(t.run.confirmDelete, {
            percent: plan.deleteThresholdPercent,
            delete: summary.delete,
            target: summary.targetFiles,
          })}
        />
      )}
      {plan.actions.length > 0 && (
        <Box
          component="details"
          sx={{ borderRadius: '16px', bgcolor: 'action.hover', px: 2, py: 1 }}
        >
          <Typography component="summary" variant="body2" sx={{ cursor: 'pointer', py: 0.5 }}>
            {t.run.changes}
            {plan.actionsTruncated ? t.run.truncated : ''}
          </Typography>
          <Box
            component="ul"
            sx={{
              m: 0,
              pl: 2,
              maxHeight: 200,
              overflow: 'auto',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
            }}
          >
            {plan.actions.map((action) => (
              <li key={`${action.kind}-${action.relPath}`}>
                {actionLabel(action.kind, t)} · {action.relPath}
                {action.bytes > 0 ? ` (${formatBytes(action.bytes)})` : ''}
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function actionLabel(
  kind: string,
  t: { run: { copy: string; update: string; delete: string; dir: string } },
): string {
  switch (kind) {
    case 'copy':
      return t.run.copy;
    case 'update':
      return t.run.update;
    case 'delete':
      return t.run.delete;
    case 'createDir':
      return t.run.dir;
    default:
      return kind;
  }
}

function ProgressBody({ progress }: { progress: RunProgress | null }) {
  const startedAt = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const total = progress?.totalActions ?? 0;
  const done = progress?.doneActions ?? 0;
  const value = total > 0 ? (done / total) * 100 : 0;
  const { t } = useT();
  const phase = progress?.phase === 'deleting' ? t.run.deleting : t.run.copying;
  const pace = runPace(
    progress?.bytesDone ?? 0,
    progress?.bytesTotal ?? 0,
    now - startedAt.current,
  );
  const paceText = [
    pace.bytesPerSec !== null ? formatSpeed(pace.bytesPerSec) : null,
    pace.etaSeconds !== null ? formatEta(pace.etaSeconds) : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2">{phase}</Typography>
      <LinearProgress variant={total > 0 ? 'determinate' : 'indeterminate'} value={value} />
      <Typography variant="body2" color="text.secondary">
        {done} / {total}
        {progress?.bytesTotal
          ? ` · ${fmt(t.run.ofBytes, { done: formatBytes(progress.bytesDone), total: formatBytes(progress.bytesTotal) })}`
          : ''}
        {paceText ? ` · ${paceText}` : ''}
      </Typography>
      {progress?.currentPath && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}
        >
          {progress.currentPath}
        </Typography>
      )}
    </Box>
  );
}

function ResultBody({ result }: { result: RunResult }) {
  const severity =
    result.phase === 'done' ? 'success' : result.phase === 'cancelled' ? 'warning' : 'error';
  const { t } = useT();
  const title =
    result.phase === 'done'
      ? t.run.finished
      : result.phase === 'cancelled'
        ? t.run.cancelled
        : t.run.failed;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity={severity}>{title}</Alert>
      <Typography variant="body2">
        {fmt(t.run.result, {
          copied: result.copied,
          updated: result.updated,
          deleted: result.deleted,
          dirs: result.dirsCreated,
          bytes: formatBytes(result.bytesCopied),
        })}
      </Typography>
      {result.errors.length > 0 && (
        <Box
          component="ul"
          sx={{ m: 0, pl: 2, maxHeight: 160, overflow: 'auto', typography: 'caption' }}
        >
          {result.errors.slice(0, 20).map((err) => (
            <li key={err}>{err}</li>
          ))}
        </Box>
      )}
    </Box>
  );
}
