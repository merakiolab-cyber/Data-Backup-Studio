import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { Ellipsis, GripVertical, HardDrive, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { hoverLift } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { IconBubble } from '@/components/IconBubble';
import type { RegisteredVolumeView } from '@/lib/bindings';
import { formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { useConfirmVolume, useRenameVolume, useUnregisterVolume } from '../api';
import { confirmReasonText, describeVolume } from '../labels';
import { CapacityBar } from './CapacityBar';
import { RemoveVolumeDialog } from './RemoveVolumeDialog';
import { VolumeNameDialog } from './VolumeNameDialog';
import { VolumeStatusChip } from './VolumeStatusChip';

type OpenDialog = 'rename' | 'remove' | null;

export function RegisteredVolumeCard({
  view,
  showDragHandle = false,
}: {
  view: RegisteredVolumeView;
  showDragHandle?: boolean;
}) {
  const { t } = useT();
  const { volume, status, live } = view;
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const rename = useRenameVolume();
  const remove = useUnregisterVolume();
  const confirm = useConfirmVolume();
  const onAccent = status.state !== 'disconnected';

  const openDialog = (next: OpenDialog) => {
    setMenuAnchor(null);
    rename.reset();
    remove.reset();
    setDialog(next);
  };

  return (
    <Box
      component="article"
      aria-label={volume.name}
      sx={(theme) => {
        const t = ds(theme);
        const background =
          status.state === 'connected'
            ? t.mint
            : status.state === 'needsConfirmation'
              ? t.lemon
              : t.surface;
        return {
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          minHeight: 236,
          p: 2.5,
          borderRadius: '28px',
          bgcolor: background,
          color: onAccent ? t.onAccent : t.ink,
          boxShadow: onAccent ? 'none' : t.shadow,
          ...hoverLift(t.shadowRaised),
        };
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {showDragHandle && (
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'flex',
              alignItems: 'center',
              opacity: 0.45,
              mr: -0.5,
            }}
          >
            <GripVertical size={18} />
          </Box>
        )}
        <IconBubble tone={onAccent ? 'glass' : 'muted'}>
          <HardDrive size={22} />
        </IconBubble>
        <Box sx={{ flex: 1 }} />
        <VolumeStatusChip status={status} mountPoint={live?.mountPoint} />
        <IconButton
          aria-label={fmt(t.volumes.options, { name: volume.name })}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
          sx={
            onAccent
              ? {
                  bgcolor: 'rgba(255, 255, 255, 0.55)',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  color: 'inherit',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.8)' },
                }
              : undefined
          }
        >
          <Ellipsis size={20} />
        </IconButton>
      </Box>

      <Box>
        <Typography variant="h3" component="h3" noWrap>
          {volume.name}
        </Typography>
        <Typography variant="body2" noWrap sx={{ opacity: 0.7 }}>
          {describeVolume(
            live ?? { model: volume.model, bus: 'unknown', fileSystem: volume.fileSystem },
            t,
          )}
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto' }}>
        {status.state === 'connected' && live && (
          <CapacityBar totalBytes={live.totalBytes} freeBytes={live.freeBytes} />
        )}
        {status.state === 'disconnected' && (
          <Typography variant="body2" color="text.secondary">
            {fmt(t.volumes.capacityOff, { bytes: formatBytes(volume.totalBytes) })}
          </Typography>
        )}
        {status.state === 'needsConfirmation' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {confirm.error?.message ?? confirmReasonText(t)[status.reason]}
            </Typography>
            {status.reason !== 'duplicate' && (
              <Button
                variant="contained"
                startIcon={<ShieldCheck size={18} />}
                loading={confirm.isPending}
                onClick={() => confirm.mutate(volume.id)}
                sx={(theme) => ({
                  flexShrink: 0,
                  bgcolor: ds(theme).accentButton,
                  color: ds(theme).onAccentButton,
                })}
              >
                {t.volumes.confirm}
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => openDialog('rename')}>
          <ListItemIcon>
            <Pencil size={18} />
          </ListItemIcon>
          {t.volumes.rename}
        </MenuItem>
        <MenuItem onClick={() => openDialog('remove')}>
          <ListItemIcon>
            <Trash2 size={18} />
          </ListItemIcon>
          {t.volumes.remove}
        </MenuItem>
      </Menu>

      <VolumeNameDialog
        open={dialog === 'rename'}
        title={t.volumes.renameTitle}
        description={t.volumes.renameHint}
        initialName={volume.name}
        submitLabel={t.common.save}
        pending={rename.isPending}
        error={rename.error}
        onSubmit={(name) =>
          rename.mutate({ id: volume.id, name }, { onSuccess: () => setDialog(null) })
        }
        onClose={() => setDialog(null)}
      />
      <RemoveVolumeDialog
        open={dialog === 'remove'}
        name={volume.name}
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate(volume.id, { onSuccess: () => setDialog(null) })}
        onClose={() => setDialog(null)}
      />
    </Box>
  );
}
