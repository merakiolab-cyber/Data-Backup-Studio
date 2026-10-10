import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { Ellipsis, HardDrive, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { hoverLift } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { IconBubble } from '@/components/IconBubble';
import type { RegisteredVolumeView } from '@/lib/bindings';
import { formatBytes } from '@/lib/format';
import { useConfirmVolume, useRenameVolume, useUnregisterVolume } from '../api';
import { confirmReasonText, describeVolume } from '../labels';
import { CapacityBar } from './CapacityBar';
import { RemoveVolumeDialog } from './RemoveVolumeDialog';
import { VolumeNameDialog } from './VolumeNameDialog';
import { VolumeStatusChip } from './VolumeStatusChip';

type OpenDialog = 'rename' | 'remove' | null;

export function RegisteredVolumeCard({ view }: { view: RegisteredVolumeView }) {
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
        <IconBubble tone={onAccent ? 'glass' : 'muted'}>
          <HardDrive size={22} />
        </IconBubble>
        <Box sx={{ flex: 1 }} />
        <VolumeStatusChip status={status} mountPoint={live?.mountPoint} />
        <IconButton
          aria-label={`Možnosti disku ${volume.name}`}
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
          )}
        </Typography>
      </Box>

      <Box sx={{ mt: 'auto' }}>
        {status.state === 'connected' && live && (
          <CapacityBar totalBytes={live.totalBytes} freeBytes={live.freeBytes} />
        )}
        {status.state === 'disconnected' && (
          <Typography variant="body2" color="text.secondary">
            Kapacita {formatBytes(volume.totalBytes)}. Připoj disk a ukáže se jeho aktuální písmeno.
          </Typography>
        )}
        {status.state === 'needsConfirmation' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {confirm.error?.message ?? confirmReasonText[status.reason]}
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
                Potvrdit disk
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
          Přejmenovat
        </MenuItem>
        <MenuItem onClick={() => openDialog('remove')}>
          <ListItemIcon>
            <Trash2 size={18} />
          </ListItemIcon>
          Odebrat z aplikace
        </MenuItem>
      </Menu>

      <VolumeNameDialog
        open={dialog === 'rename'}
        title="Přejmenovat disk"
        description="Název uvidíš v úlohách a v historii záloh."
        initialName={volume.name}
        submitLabel="Uložit"
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
