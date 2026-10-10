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
  Ellipsis,
  Folder,
  HardDrive,
  Pencil,
  Play,
  Trash2,
  Unplug,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { duration, ease, hoverLift, pulseRing } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { DesignTokens } from '@/app/theme/tokens';
import { IconBubble } from '@/components/IconBubble';
import type { EndpointView, JobView } from '@/lib/bindings';
import { useDeleteJob } from '../api';
import { displayLocation, modeLabels } from '../labels';
import { DeleteJobDialog } from './DeleteJobDialog';

interface Readiness {
  icon: ReactNode;
  label: string;
  tone: keyof Pick<DesignTokens, 'mint' | 'lemon' | 'muted'>;
}

/** Short state for the pill; which disk it concerns is visible in the endpoint rows above. */
function readiness({ source, target }: JobView): Readiness {
  const states = [source.status.state, target.status.state];
  if (states.includes('needsConfirmation')) {
    return { icon: <CircleAlert size={16} />, label: 'Disk potřebuje ověřit', tone: 'lemon' };
  }
  if (states.includes('disconnected')) {
    return { icon: <Unplug size={16} />, label: 'Disk nepřipojený', tone: 'muted' };
  }
  return { icon: <CircleCheck size={16} />, label: 'Připraveno', tone: 'mint' };
}

export function JobCard({ view }: { view: JobView }) {
  const { job } = view;
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const remove = useDeleteJob();
  const state = readiness(view);

  return (
    <Box
      component="article"
      aria-label={job.name}
      sx={(theme) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2.5,
        borderRadius: '28px',
        bgcolor: ds(theme).surface,
        boxShadow: ds(theme).shadow,
        ...hoverLift(ds(theme).shadowRaised),
        '& .job-arrow': { transition: `transform ${duration.hover * 2}ms ${ease.spring}` },
        '&:hover .job-arrow': { transform: 'translateY(4px)' },
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h3" component="h3" noWrap>
            {job.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {modeLabels[job.mode].title}
            {job.excludes.length > 0 && ` · vynechává ${job.excludes.length}× vzor`}
          </Typography>
        </Box>
        <IconButton
          aria-label={`Možnosti úlohy ${job.name}`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <Ellipsis size={20} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Endpoint
          icon={<Folder size={18} />}
          label="Zdroj"
          view={view.source}
          relPath={job.source.relPath}
        />
        <Box className="job-arrow" sx={{ pl: '12px', color: 'text.disabled' }} aria-hidden>
          <ArrowDown size={16} />
        </Box>
        <Endpoint
          icon={<HardDrive size={18} />}
          label="Cíl"
          view={view.target}
          relPath={job.target.relPath}
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' }}>
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
        <Tooltip title="Spouštění záloh přijde v další verzi">
          <span>
            <Button variant="contained" startIcon={<Play size={16} />} disabled>
              Spustit
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => navigate(`/ulohy/${job.id}`)}>
          <ListItemIcon>
            <Pencil size={18} />
          </ListItemIcon>
          Upravit
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
          Smazat
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
  relPath,
}: {
  icon: ReactNode;
  label: string;
  view: EndpointView;
  relPath: string;
}) {
  const location = displayLocation(relPath, view.path);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <IconBubble size={40} tone="muted">
        {icon}
      </IconBubble>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" component="p" noWrap>
          {label} · {view.volumeName}
        </Typography>
        <Typography variant="body2" noWrap title={location} sx={{ fontWeight: 500 }}>
          {location}
        </Typography>
      </Box>
    </Box>
  );
}
