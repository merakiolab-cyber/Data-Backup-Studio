import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ChevronDown, Ellipsis, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import { cardGridSx } from '@/app/theme/layout';
import { duration, ease } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { JobGroup, JobGroupId, JobId, JobView, RunSummary } from '@/lib/bindings';
import { fmt, plural, useT } from '@/lib/i18n';
import { decodeJobDrag } from '../groupLayout';
import { JobCard } from './JobCard';

export function JobGroupSection({
  group,
  jobs,
  collapsed,
  onToggleCollapsed,
  selected,
  onSelectedChange,
  onSelectJobs,
  onMoveJobs,
  dragIdsFor,
  lastByJob,
  onRename,
  onDelete,
}: {
  group: JobGroup | null;
  jobs: JobView[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  selected: Set<JobId>;
  onSelectedChange: (id: JobId, value: boolean) => void;
  onSelectJobs: (ids: JobId[], value: boolean) => void;
  onMoveJobs: (ids: JobId[], groupId: JobGroupId | null) => void;
  dragIdsFor: (id: JobId) => JobId[];
  lastByJob: Map<JobId, RunSummary>;
  onRename?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
}) {
  const { t, locale } = useT();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const dragDepth = useRef(0);
  const title = group?.name ?? t.jobs.ungrouped;
  const countLabel = plural(locale, jobs.length, t.jobs.groupCount);
  const ids = jobs.map((view) => view.job.id);
  const allInGroup = ids.length > 0 && ids.every((id) => selected.has(id));

  if (jobs.length === 0 && group === null) {
    return null;
  }

  const acceptsDrag = (event: DragEvent) => event.dataTransfer.types.includes('text/plain');

  return (
    <Box
      component="section"
      onDragEnter={(event) => {
        if (!acceptsDrag(event)) {
          return;
        }
        event.preventDefault();
        dragDepth.current += 1;
        setDropOver(true);
      }}
      onDragOver={(event) => {
        if (!acceptsDrag(event)) {
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) {
          setDropOver(false);
        }
      }}
      onDrop={(event) => {
        dragDepth.current = 0;
        setDropOver(false);
        const ids = decodeJobDrag(event.dataTransfer.getData('text/plain'));
        if (!ids) {
          return;
        }
        event.preventDefault();
        onMoveJobs(ids, group?.id ?? null);
      }}
      sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
    >
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 0.5,
          minHeight: 40,
          borderRadius: '16px',
          outline: dropOver ? `2px solid ${ds(theme).mint}` : '2px solid transparent',
          bgcolor: dropOver ? `${ds(theme).mint}33` : 'transparent',
          transition: `background-color ${duration.hover}ms ${ease.standard}, outline-color ${duration.hover}ms ${ease.standard}`,
          '&:hover': { bgcolor: dropOver ? `${ds(theme).mint}33` : ds(theme).muted },
        })}
      >
        <IconButton
          size="small"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.jobs.expandGroup : t.jobs.collapseGroup}
          onClick={onToggleCollapsed}
          sx={{
            transform: collapsed ? 'rotate(-90deg)' : 'none',
            transition: `transform ${duration.hover}ms ${ease.standard}`,
          }}
        >
          <ChevronDown size={20} />
        </IconButton>
        <Box
          sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={onToggleCollapsed}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onToggleCollapsed();
            }
          }}
        >
          <Typography variant="subtitle1" component="h3" noWrap sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, pr: 0.5 }}>
          {countLabel}
        </Typography>
        <Button
          size="small"
          color="inherit"
          disabled={ids.length === 0}
          aria-label={fmt(allInGroup ? t.jobs.clearGroup : t.jobs.selectGroup, { name: title })}
          onClick={() => onSelectJobs(ids, !allInGroup)}
        >
          {allInGroup ? t.jobs.clearSelection : t.jobs.select}
        </Button>
        {group && (
          <>
            <IconButton
              size="small"
              aria-label={fmt(t.jobs.groupOptions, { name: group.name })}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <Ellipsis size={18} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={menuAnchor !== null}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onRename?.();
                }}
              >
                <ListItemIcon>
                  <Pencil size={18} />
                </ListItemIcon>
                {t.jobs.renameGroup}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  onDelete?.();
                }}
              >
                <ListItemIcon>
                  <Trash2 size={18} />
                </ListItemIcon>
                {t.jobs.deleteGroup}
              </MenuItem>
            </Menu>
          </>
        )}
        {group === null && (
          <Box sx={{ color: 'text.disabled', display: 'flex', pr: 1 }} aria-hidden>
            <FolderOpen size={18} />
          </Box>
        )}
      </Box>

      <Collapse
        in={!collapsed}
        timeout={reduceMotion ? 0 : { enter: duration.fold, exit: 400 }}
        easing={{ enter: ease.emphasized, exit: ease.standard }}
        unmountOnExit
        sx={{
          '& .MuiCollapse-wrapperInner': {
            opacity: 1,
            transition: `opacity ${duration.fold}ms ${ease.emphasized}`,
          },
          '&.MuiCollapse-hidden .MuiCollapse-wrapperInner, &.MuiCollapse-exiting .MuiCollapse-wrapperInner':
            {
              opacity: 0,
            },
        }}
      >
        <Box sx={{ ...cardGridSx('wide'), pt: 1.5 }}>
          {jobs.map((view) => (
            <JobCard
              key={view.job.id}
              view={view}
              selected={selected.has(view.job.id)}
              onSelectedChange={(value) => onSelectedChange(view.job.id, value)}
              dragIds={dragIdsFor(view.job.id)}
              lastRun={lastByJob.get(view.job.id) ?? null}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}
