import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { FolderInput, FolderSync, Layers, Play, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { useRuns } from '@/features/history/api';
import { latestByJob } from '@/features/overview/stats';
import type { JobGroup, JobGroupId, JobId } from '@/lib/bindings';
import { fmt, useT } from '@/lib/i18n';
import {
  useCreateJobGroup,
  useDeleteJobGroup,
  useJobs,
  useRenameJobGroup,
  useSetJobsGroup,
} from './api';
import { GroupNameDialog } from './components/GroupNameDialog';
import { JobGroupSection } from './components/JobGroupSection';
import { buildJobSections, readCollapsedGroups, writeCollapsedGroups } from './groupLayout';
import { isJobReady } from './labels';
import { useRunSession } from './runSession';

export function NewJobButton() {
  const { t } = useT();
  return (
    <Button component={Link} to="/ulohy/nova" variant="contained" startIcon={<Plus size={18} />}>
      {t.jobs.new}
    </Button>
  );
}

export function JobsPage() {
  const { t } = useT();
  const jobsQuery = useJobs();
  const runs = useRuns();
  const overview = jobsQuery.data;
  const views = overview?.jobs ?? [];
  const groups = overview?.groups ?? [];
  const lastByJob = latestByJob(runs.data ?? []);
  const [selected, setSelected] = useState<Set<JobId>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(() => readCollapsedGroups());
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renaming, setRenaming] = useState<JobGroup | null>(null);
  const [moveAnchor, setMoveAnchor] = useState<HTMLElement | null>(null);
  const { enqueue } = useRunSession();
  const createGroup = useCreateJobGroup();
  const renameGroup = useRenameJobGroup();
  const deleteGroup = useDeleteJobGroup();
  const setJobsGroup = useSetJobsGroup();

  const sections = useMemo(() => buildJobSections(groups, views), [groups, views]);
  const selectedViews = useMemo(
    () => views.filter((view) => selected.has(view.job.id)),
    [views, selected],
  );
  const pool = selected.size > 0 ? selectedViews : views;
  const ready = pool.filter(isJobReady);
  const unready = pool.length - ready.length;
  const runLabel = selected.size > 0 ? t.jobs.runSelected : t.jobs.runAll;
  const runTitle =
    ready.length === 0
      ? selected.size > 0
        ? t.jobs.noneReadySelected
        : t.jobs.noneReady
      : selected.size > 0
        ? fmt(t.jobs.runSelectedHint, { count: ready.length })
        : fmt(t.jobs.runAllHint, { count: ready.length });

  const setMany = (ids: JobId[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const allIds = views.map((view) => view.job.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  const toggleCollapsed = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writeCollapsedGroups(next);
      return next;
    });
  };

  const moveJobs = (ids: JobId[], groupId: JobGroupId | null) => {
    const changing = ids.filter((id) => {
      const current = views.find((view) => view.job.id === id)?.job.groupId ?? null;
      return current !== groupId;
    });
    if (changing.length === 0) {
      return;
    }
    setJobsGroup.mutate(
      { jobIds: changing, groupId },
      {
        onSuccess: () =>
          setSelected((prev) => {
            const next = new Set(prev);
            for (const id of changing) {
              next.delete(id);
            }
            return next;
          }),
      },
    );
  };

  const dragIdsFor = (id: JobId): JobId[] =>
    selected.has(id) && selected.size > 1 ? [...selected] : [id];

  const startBatch = () => {
    if (ready.length === 0) {
      return;
    }
    enqueue(
      ready.map((view) => ({ id: view.job.id, name: view.job.name })),
      unready,
    );
  };

  const selectedIds = [...selected];

  return (
    <Page
      title={t.jobs.title}
      description={t.jobs.description}
      actions={
        views.length > 0 ? (
          <>
            <Tooltip title={runTitle}>
              <span>
                <Button
                  variant="contained"
                  startIcon={<Play size={16} />}
                  disabled={ready.length === 0}
                  onClick={startBatch}
                  sx={(theme) => ({
                    '&&': { bgcolor: ds(theme).mint, color: ds(theme).onAccent },
                    '&:hover': { bgcolor: ds(theme).mint, filter: 'brightness(0.96)' },
                    '&.Mui-disabled': { bgcolor: ds(theme).muted, color: ds(theme).inkFaint },
                  })}
                >
                  {runLabel}
                </Button>
              </span>
            </Tooltip>
            <NewJobButton />
          </>
        ) : undefined
      }
    >
      {jobsQuery.isPending && <LinearProgress aria-label={t.common.loadingJobs} />}
      {jobsQuery.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => jobsQuery.refetch()}>
              {t.common.retry}
            </Button>
          }
        >
          {jobsQuery.error.message}
        </Alert>
      )}
      {overview &&
        (views.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, ...stagger(60, 8) }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {selected.size > 0
                  ? fmt(t.jobs.selected, { count: selected.size })
                  : fmt(t.jobs.section, { count: views.length })}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {selected.size > 0 && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Layers size={16} />}
                      onClick={() => {
                        createGroup.reset();
                        setCreatingGroup(true);
                      }}
                    >
                      {t.jobs.groupSelected}
                    </Button>
                    <Button
                      color="inherit"
                      onClick={() => moveJobs(selectedIds, null)}
                      disabled={setJobsGroup.isPending}
                    >
                      {t.jobs.ungroupSelected}
                    </Button>
                    {groups.length > 0 && (
                      <Button
                        color="inherit"
                        startIcon={<FolderInput size={16} />}
                        disabled={setJobsGroup.isPending}
                        onClick={(event) => setMoveAnchor(event.currentTarget)}
                      >
                        {t.jobs.moveTo}
                      </Button>
                    )}
                  </>
                )}
                <Button color="inherit" onClick={() => setMany(allIds, !allSelected)}>
                  {allSelected ? t.jobs.clearSelection : t.jobs.selectAll}
                </Button>
              </Box>
            </Box>

            {sections.map((section) => {
              const group = section.group;
              const key = group?.id ?? '__ungrouped__';
              return (
                <JobGroupSection
                  key={key}
                  group={group}
                  jobs={section.jobs}
                  collapsed={collapsed.has(key)}
                  onToggleCollapsed={() => toggleCollapsed(key)}
                  selected={selected}
                  onSelectedChange={(id, value) => setMany([id], value)}
                  onSelectJobs={setMany}
                  onMoveJobs={moveJobs}
                  dragIdsFor={dragIdsFor}
                  lastByJob={lastByJob}
                  onRename={
                    group
                      ? () => {
                          renameGroup.reset();
                          setRenaming(group);
                        }
                      : undefined
                  }
                  onDelete={
                    group
                      ? () => {
                          if (
                            window.confirm(fmt(t.jobs.deleteGroupConfirm, { name: group.name }))
                          ) {
                            deleteGroup.mutate(group.id);
                          }
                        }
                      : undefined
                  }
                />
              );
            })}
          </Box>
        ) : (
          <EmptyState
            icon={<FolderSync size={32} />}
            title={t.jobs.emptyTitle}
            description={t.jobs.emptyDescription}
            action={<NewJobButton />}
          />
        ))}

      <Menu anchorEl={moveAnchor} open={moveAnchor !== null} onClose={() => setMoveAnchor(null)}>
        {groups.map((group) => (
          <MenuItem
            key={group.id}
            onClick={() => {
              setMoveAnchor(null);
              moveJobs(selectedIds, group.id);
            }}
          >
            {group.name}
          </MenuItem>
        ))}
      </Menu>

      <GroupNameDialog
        open={creatingGroup}
        title={t.jobs.createGroupTitle}
        confirmLabel={t.jobs.createGroup}
        pending={createGroup.isPending}
        error={createGroup.error}
        onConfirm={(name) =>
          createGroup.mutate(
            { name, jobIds: selectedIds },
            {
              onSuccess: () => {
                setCreatingGroup(false);
                setSelected(new Set());
              },
            },
          )
        }
        onClose={() => setCreatingGroup(false)}
      />

      <GroupNameDialog
        open={renaming !== null}
        title={t.jobs.renameGroupTitle}
        initial={renaming?.name ?? ''}
        confirmLabel={t.common.save}
        pending={renameGroup.isPending}
        error={renameGroup.error}
        onConfirm={(name) => {
          if (!renaming) {
            return;
          }
          renameGroup.mutate({ id: renaming.id, name }, { onSuccess: () => setRenaming(null) });
        }}
        onClose={() => setRenaming(null)}
      />
    </Page>
  );
}
