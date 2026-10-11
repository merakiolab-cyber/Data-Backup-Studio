import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  ArrowDown,
  CircleAlert,
  CircleCheck,
  Copy,
  Ellipsis,
  Folder,
  FolderOpen,
  HardDrive,
  Pencil,
  Play,
  Trash2,
  Unplug,
} from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { duration, ease, hoverLift, pulseRing } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { DesignTokens } from '@/app/theme/tokens';
import { IconBubble } from '@/components/IconBubble';
import { statusLabels } from '@/features/history/labels';
import type { EndpointView, JobId, JobView, Location, RunSummary } from '@/lib/bindings';
import { formatWhen } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { openLocation, useDeleteJob } from '../api';
import { encodeJobDrag } from '../groupLayout';
import { displayLocation, isJobReady, modeLabels } from '../labels';
import { useRunSession } from '../runSession';
import { DeleteJobDialog } from './DeleteJobDialog';

interface Readiness {
  icon: ReactNode;
  label: string;
  tone: keyof Pick<DesignTokens, 'mint' | 'lemon' | 'muted'>;
}

/** Short state for the pill; which disk it concerns is visible in the endpoint rows above. */
function readiness(
  { source, target }: JobView,
  labels: { ready: string; diskOff: string; diskCheck: string },
): Readiness {
  const states = [source.status.state, target.status.state];
  if (states.includes('needsConfirmation')) {
    return { icon: <CircleAlert size={16} />, label: labels.diskCheck, tone: 'lemon' };
  }
  if (states.includes('disconnected')) {
    return { icon: <Unplug size={16} />, label: labels.diskOff, tone: 'muted' };
  }
  return { icon: <CircleCheck size={16} />, label: labels.ready, tone: 'mint' };
}

export function JobCard({
  view,
  selected = false,
  onSelectedChange,
  dragIds,
  lastRun = null,
}: {
  view: JobView;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  /** Ids carried when this tile is dragged. Omitted outside the Jobs page. */
  dragIds?: JobId[] | undefined;
  lastRun?: RunSummary | null;
}) {
  const { t } = useT();
  const { job } = view;
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dragged = useRef(false);
  const { enqueue } = useRunSession();
  const remove = useDeleteJob();
  const state = readiness(view, {
    ready: t.jobs.ready,
    diskOff: t.jobs.diskOff,
    diskCheck: t.jobs.diskCheck,
  });
  const canRun = isJobReady(view);
  const modes = modeLabels(t);
  const statuses = statusLabels(t);
  const selectable = onSelectedChange !== undefined;

  const toggleSelect = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onSelectedChange?.(!selected);
  };

  return (
    <Box
      component="article"
      aria-label={job.name}
      aria-selected={selectable ? selected : undefined}
      draggable={dragIds !== undefined}
      onDragStart={(event) => {
        if (!dragIds) {
          return;
        }
        dragged.current = true;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', encodeJobDrag(dragIds));
      }}
      onDragEnd={() => {
        window.setTimeout(() => {
          dragged.current = false;
        }, 0);
      }}
      onClick={selectable ? toggleSelect : undefined}
      sx={(theme) => ({
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        p: 3,
        borderRadius: '28px',
        cursor: dragIds ? 'grab' : 'default',
        bgcolor: selected ? `${ds(theme).mint}55` : ds(theme).surface,
        boxShadow: ds(theme).shadow,
        outline: selected ? `2px solid ${ds(theme).mint}` : '2px solid transparent',
        ...hoverLift(ds(theme).shadowRaised),
        transition: [
          `background-color ${duration.hover}ms ${ease.standard}`,
          `outline-color ${duration.hover}ms ${ease.standard}`,
          `transform ${duration.hover}ms ${ease.standard}`,
          `box-shadow ${duration.hover}ms ${ease.standard}`,
        ].join(', '),
        '& .job-arrow': { transition: `transform ${duration.hover * 2}ms ${ease.spring}` },
        '&:hover .job-arrow': { transform: 'translateY(4px)' },
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h3" component="h3" noWrap>
            {job.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.25 }}>
            {modes[job.mode].title}
            {job.excludes.length > 0 &&
              ` · ${fmt(t.jobs.skipPatterns, { count: job.excludes.length })}`}
            {lastRun ? ` · ${statuses[lastRun.status]} ${formatWhen(lastRun.finishedAtMs)}` : ''}
          </Typography>
        </Box>
        <IconButton
          aria-label={fmt(t.jobs.options, { name: job.name })}
          onClick={(event) => {
            event.stopPropagation();
            setMenuAnchor(event.currentTarget);
          }}
        >
          <Ellipsis size={20} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Endpoint
          icon={<Folder size={18} />}
          label={t.common.source}
          view={view.source}
          location={job.source}
        />
        <Box className="job-arrow" sx={{ pl: '12px', color: 'text.disabled' }} aria-hidden>
          <ArrowDown size={16} />
        </Box>
        <Endpoint
          icon={<HardDrive size={18} />}
          label={t.common.target}
          view={view.target}
          location={job.target}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto', pt: 0.5 }}>
        <Box
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            minWidth: 0,
            height: 34,
            px: 1.5,
            borderRadius: '999px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            bgcolor: ds(theme)[state.tone],
            color: state.tone === 'muted' ? ds(theme).inkMuted : ds(theme).onAccent,
          })}
        >
          <Box
            component="span"
            sx={{
              display: 'flex',
              flexShrink: 0,
              borderRadius: '50%',
              animation:
                state.tone === 'mint' ? `${pulseRing} 2.4s ${ease.standard} infinite` : 'none',
            }}
          >
            {state.icon}
          </Box>
          <Box
            component="span"
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {state.label}
          </Box>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={canRun ? t.jobs.runHint : t.jobs.runDisabled}>
          <span>
            <Button
              variant="contained"
              startIcon={<Play size={16} />}
              disabled={!canRun}
              onClick={(event) => {
                event.stopPropagation();
                enqueue([{ id: job.id, name: job.name }]);
              }}
            >
              {t.jobs.run}
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuItem onClick={() => navigate(`/ulohy/${job.id}`)}>
          <ListItemIcon>
            <Pencil size={18} />
          </ListItemIcon>
          {t.jobs.edit}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            remove.reset();
            setDeleting(true);
          }}
        >
          <ListItemIcon>
            <Trash2 size={18} />
          </ListItemIcon>
          {t.jobs.delete}
        </MenuItem>
      </Menu>

      <DeleteJobDialog
        open={deleting}
        name={job.name}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(job.id, { onSuccess: () => setDeleting(false) })}
        onClose={() => setDeleting(false)}
      />
    </Box>
  );
}

function Endpoint({
  icon,
  label,
  view,
  location,
}: {
  icon: ReactNode;
  label: string;
  view: EndpointView;
  location: Location;
}) {
  const { t } = useT();
  const text = displayLocation(location.relPath, view.path);
  const canOpen = view.path !== null;

  const copyPath = () => {
    if (view.path) {
      void navigator.clipboard.writeText(view.path);
    }
  };

  const openFolder = () => {
    void openLocation(location).catch((err: unknown) => {
      window.alert(err instanceof Error ? err.message : t.jobs.openFailed);
    });
  };

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}
      onClick={(event) => event.stopPropagation()}
    >
      <IconBubble size={40} tone="muted">
        {icon}
      </IconBubble>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" component="p" noWrap>
          {label} · {view.volumeName}
        </Typography>
        <Typography variant="body2" noWrap title={text} sx={{ fontWeight: 500 }}>
          {text}
        </Typography>
      </Box>
      {canOpen && (
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          <Tooltip title={t.jobs.copyPath}>
            <IconButton aria-label={fmt(t.jobs.copyPathOf, { end: label })} onClick={copyPath}>
              <Copy size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.jobs.openFolder}>
            <IconButton aria-label={fmt(t.jobs.openFolderOf, { end: label })} onClick={openFolder}>
              <FolderOpen size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
