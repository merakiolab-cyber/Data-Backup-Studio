import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import EditRounded from '@mui/icons-material/EditRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import UsbRounded from '@mui/icons-material/UsbRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
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

  const openDialog = (next: OpenDialog) => {
    setMenuAnchor(null);
    rename.reset();
    remove.reset();
    setDialog(next);
  };

  return (
    <Card sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: 3,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (theme.vars ?? theme).palette.m3.primaryContainer,
            color: (theme.vars ?? theme).palette.m3.onPrimaryContainer,
          })}
        >
          <UsbRounded />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {volume.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {describeVolume(
              live ?? { model: volume.model, bus: 'unknown', fileSystem: volume.fileSystem },
            )}
            {!live && ` · ${formatBytes(volume.totalBytes)}`}
          </Typography>
        </Box>
        <VolumeStatusChip status={status} mountPoint={live?.mountPoint} />
        <IconButton
          aria-label={`Možnosti disku ${volume.name}`}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <MoreVertRounded />
        </IconButton>
      </Box>

      {live && status.state === 'connected' && (
        <Box sx={{ mt: 2, pl: 8 }}>
          <CapacityBar totalBytes={live.totalBytes} freeBytes={live.freeBytes} />
        </Box>
      )}

      {status.state === 'needsConfirmation' && (
        <Alert
          severity="warning"
          sx={{ mt: 2 }}
          action={
            status.reason !== 'duplicate' && (
              <Button
                color="inherit"
                size="small"
                loading={confirm.isPending}
                onClick={() => confirm.mutate(volume.id)}
              >
                Potvrdit disk
              </Button>
            )
          }
        >
          {confirm.error?.message ?? confirmReasonText[status.reason]}
        </Alert>
      )}

      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => openDialog('rename')}>
          <ListItemIcon>
            <EditRounded fontSize="small" />
          </ListItemIcon>
          Přejmenovat
        </MenuItem>
        <MenuItem onClick={() => openDialog('remove')}>
          <ListItemIcon>
            <DeleteOutlineRounded fontSize="small" />
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
    </Card>
  );
}
