import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  ArrowLeft,
  CircleHelp,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderSearch,
  HardDrive,
  Save,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { twoColumnSx } from '@/app/theme/layout';
import { stagger } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { IconBubble } from '@/components/IconBubble';
import { Page } from '@/components/Page';
import { useVolumes } from '@/features/volumes/api';
import type { JobId, LocatedFolder, RegisteredVolumeView } from '@/lib/bindings';
import { driveLabel, formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { pickFolder, useCreateJobGroup, useJobs, useSaveJob, useSetJobsGroup } from './api';
import { ExcludesField } from './components/ExcludesField';
import { FitCheck } from './components/FitCheck';
import { FormBlock } from './components/FormBlock';
import { ModePicker } from './components/ModePicker';
import {
  emptyForm,
  formFromJob,
  type JobForm,
  MAX_NAME_LENGTH,
  toInput,
  withSource,
} from './jobForm';
import { displayLocation } from './labels';

/** Sentinel `<select>` value for "create a new group"; real group ids are UUIDs. */
const NEW_GROUP = '__new-group__';

export function JobEditorPage() {
  const { t } = useT();
  const { id } = useParams();
  const jobs = useJobs();
  const navigate = useNavigate();
  const back = (
    <Tooltip title={t.editor.back}>
      <IconButton aria-label={t.editor.back} onClick={() => navigate('/ulohy')}>
        <ArrowLeft size={20} />
      </IconButton>
    </Tooltip>
  );

  if (!id) {
    return (
      <Page title={t.editor.newTitle} description={t.editor.newDescription} actions={back}>
        <JobEditor jobId={null} initial={emptyForm()} />
      </Page>
    );
  }

  const view = jobs.data?.jobs.find((v) => v.job.id === id);
  return (
    <Page
      title={view?.job.name ?? t.editor.editTitle}
      description={t.editor.editDescription}
      actions={back}
    >
      {jobs.isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label={t.common.loadingJob} />
        </Box>
      ) : view ? (
        <JobEditor key={id} jobId={id} initial={formFromJob(view)} />
      ) : (
        <EmptyState
          icon={<FolderSearch size={32} />}
          title={t.editor.missingTitle}
          description={t.editor.missingDescription}
          action={
            <Button component={Link} to="/ulohy" variant="contained">
              {t.editor.back}
            </Button>
          }
        />
      )}
    </Page>
  );
}

function JobEditor({ jobId, initial }: { jobId: JobId | null; initial: JobForm }) {
  const { t } = useT();
  const navigate = useNavigate();
  const volumes = useVolumes();
  const jobs = useJobs();
  const save = useSaveJob();
  const setGroup = useSetJobsGroup();
  const createGroup = useCreateJobGroup();
  const groups = jobs.data?.groups ?? [];
  const [form, setForm] = useState(initial);
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  /** `null` = no new group; otherwise the name typed for a group created together with the job. */
  const [newGroupName, setNewGroupName] = useState<string | null>(null);
  const targets = volumes.data?.registered ?? [];
  const target = targets.find((t) => t.volume.id === form.targetVolumeId);
  const input = toInput(form);
  const newGroupTrimmed = newGroupName?.trim() ?? null;
  const newGroupInvalid =
    newGroupTrimmed !== null &&
    (newGroupTrimmed.length === 0 || newGroupTrimmed.length > MAX_NAME_LENGTH);
  const busy = save.isPending || setGroup.isPending || createGroup.isPending;

  const pick = async (apply: (folder: LocatedFolder) => void, defaultPath?: string) => {
    setPickError(null);
    setPicking(true);
    try {
      const folder = await pickFolder(defaultPath);
      if (folder) {
        apply(folder);
      }
    } catch (error) {
      setPickError(error instanceof Error ? error.message : String(error));
    } finally {
      setPicking(false);
    }
  };

  const pickSource = () => pick((folder) => setForm((f) => withSource(f, folder)));

  const pickTarget = () =>
    target?.live &&
    pick((folder) => {
      if (folder.targetId !== target.volume.id) {
        setPickError(fmt(t.editor.wrongDisk, { name: target.volume.name }));
      } else {
        setForm((f) => ({ ...f, targetRelPath: folder.relPath }));
      }
    }, target.live.mountPoint);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (input && !busy && !newGroupInvalid) {
      save.mutate(
        { id: jobId, input },
        {
          onSuccess: (job) => {
            if (newGroupTrimmed !== null) {
              createGroup.mutate(
                { name: newGroupTrimmed, jobIds: [job.id] },
                {
                  onSuccess: () => navigate('/ulohy'),
                  // The job is already saved; reopen it so the group can be retried without a duplicate.
                  onError: () => navigate(`/ulohy/${job.id}`),
                },
              );
              return;
            }
            if ((form.groupId ?? null) === initial.groupId) {
              navigate('/ulohy');
              return;
            }
            setGroup.mutate(
              { jobIds: [job.id], groupId: form.groupId },
              { onSuccess: () => navigate('/ulohy') },
            );
          },
        },
      );
    }
  };

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, ...stagger(60) }}
    >
      <Box sx={twoColumnSx(2.5)}>
        <FormBlock step={1} title={t.editor.stepSource} description={t.editor.stepSourceHint}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <IconBubble size={56} tone="muted">
              {form.source ? <Folder size={24} /> : <FolderOpen size={24} />}
            </IconBubble>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              {form.source ? (
                <>
                  <Typography variant="caption" color="text.secondary" component="p">
                    {form.source.volumeName}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ wordBreak: 'break-all' }}>
                    {displayLocation(form.source.relPath, form.source.path)}
                  </Typography>
                </>
              ) : (
                <Typography color="text.secondary">{t.editor.noFolder}</Typography>
              )}
            </Box>
            <Button
              variant={form.source ? 'outlined' : 'contained'}
              startIcon={<FolderSearch size={18} />}
              onClick={pickSource}
              disabled={picking}
            >
              {form.source ? t.editor.change : t.editor.pickFolder}
            </Button>
          </Box>
        </FormBlock>

        <FormBlock step={2} title={t.editor.stepTarget} description={t.editor.stepTargetHint}>
          {targets.length === 0 && !volumes.isPending ? (
            <Alert
              severity="info"
              action={
                <Button component={Link} to="/disky" size="small">
                  Disky
                </Button>
              }
            >
              {t.editor.registerFirst}
            </Alert>
          ) : (
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 2 }}
            >
              <TextField
                select
                label={t.editor.disk}
                value={form.targetVolumeId ?? ''}
                onChange={(event) => setForm((f) => ({ ...f, targetVolumeId: event.target.value }))}
              >
                {targets.map((vol) => (
                  <MenuItem key={vol.volume.id} value={vol.volume.id}>
                    <HardDrive size={16} style={{ marginRight: 8, flexShrink: 0 }} />
                    {vol.volume.name}
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      {targetState(vol, t)}
                    </Typography>
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label={t.editor.folderOnDisk}
                  value={form.targetRelPath}
                  onChange={(event) =>
                    setForm((f) => ({ ...f, targetRelPath: event.target.value }))
                  }
                  slotProps={{
                    input: {
                      startAdornment: target?.live ? (
                        <InputAdornment position="start">
                          {driveLabel(target.live.mountPoint)}\
                        </InputAdornment>
                      ) : undefined,
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title={t.editor.folderCreated}>
                            <IconButton
                              size="small"
                              aria-label={t.editor.folderCreated}
                              edge="end"
                              tabIndex={0}
                            >
                              <CircleHelp size={18} />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Tooltip title={target?.live ? t.editor.pickExisting : t.editor.diskOff}>
                  <span>
                    <IconButton
                      aria-label={t.editor.pickTargetFolder}
                      onClick={pickTarget}
                      disabled={!target?.live || picking}
                      sx={{ mt: '6px' }}
                    >
                      <FolderSearch size={20} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          )}
        </FormBlock>
      </Box>

      <FitCheck
        sourcePath={form.source?.path ?? null}
        excludes={form.excludes}
        targetFreeBytes={target?.live ? target.live.freeBytes : null}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          width: '100%',
          alignItems: 'stretch',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, minmax(0, 1fr))',
          },
        }}
      >
        <FormBlock step={3} title={t.editor.stepMode} description={t.editor.stepModeHint}>
          <ModePicker value={form.mode} onChange={(mode) => setForm((f) => ({ ...f, mode }))} />
        </FormBlock>

        <FormBlock step={4} title={t.editor.stepName} description={t.editor.stepNameHint}>
          <TextField
            fullWidth
            label={t.editor.jobName}
            value={form.name}
            onChange={(event) =>
              setForm((f) => ({ ...f, name: event.target.value, nameTouched: true }))
            }
            error={form.name.trim().length > MAX_NAME_LENGTH}
            helperText={`${form.name.trim().length}/${MAX_NAME_LENGTH} ${t.common.characters}`}
          />
        </FormBlock>

        <FormBlock step={5} title={t.editor.stepGroup} description={t.editor.stepGroupHint}>
          <TextField
            select
            fullWidth
            label={t.editor.stepGroup}
            value={newGroupName !== null ? NEW_GROUP : (form.groupId ?? '')}
            onChange={(event) => {
              const value = event.target.value;
              if (value === NEW_GROUP) {
                setNewGroupName((current) => current ?? target?.volume.name ?? '');
                return;
              }
              setNewGroupName(null);
              setForm((current) => ({ ...current, groupId: value === '' ? null : value }));
            }}
          >
            <MenuItem value="">{t.jobs.ungrouped}</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
            <MenuItem value={NEW_GROUP}>
              <FolderPlus size={16} style={{ marginRight: 8, flexShrink: 0 }} />
              {t.editor.newGroup}
            </MenuItem>
          </TextField>
          {newGroupName !== null && (
            <TextField
              autoFocus
              fullWidth
              label={t.editor.newGroupName}
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              error={newGroupInvalid && newGroupName.length > 0}
              helperText={t.jobs.groupNameHint}
              sx={{ mt: 2 }}
            />
          )}
        </FormBlock>
      </Box>

      <FormBlock step={6} title={t.editor.stepExcludes} description={t.editor.stepExcludesHint}>
        <ExcludesField
          value={form.excludes}
          onChange={(excludes) => setForm((f) => ({ ...f, excludes }))}
        />
      </FormBlock>

      {(pickError ?? save.error ?? setGroup.error ?? createGroup.error) && (
        <Alert severity="error">
          {pickError ??
            save.error?.message ??
            setGroup.error?.message ??
            createGroup.error?.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
        <Button onClick={() => navigate('/ulohy')}>{t.common.cancel}</Button>
        <Button
          type="submit"
          variant="contained"
          startIcon={<Save size={18} />}
          disabled={!input || newGroupInvalid}
          loading={busy}
        >
          {jobId ? t.editor.save : t.editor.create}
        </Button>
      </Box>
    </Box>
  );
}

function targetState(
  { status, live }: RegisteredVolumeView,
  t: { editor: { needsCheck: string; disconnected: string; freeSpace: string } },
): string {
  if (status.state === 'connected' && live) {
    return `${driveLabel(live.mountPoint)} · ${fmt(t.editor.freeSpace, { free: formatBytes(live.freeBytes) })}`;
  }
  return status.state === 'needsConfirmation' ? t.editor.needsCheck : t.editor.disconnected;
}
