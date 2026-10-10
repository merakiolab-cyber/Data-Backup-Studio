import AddRounded from '@mui/icons-material/AddRounded';
import ComputerRounded from '@mui/icons-material/ComputerRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import UsbRounded from '@mui/icons-material/UsbRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { Fragment, useState } from 'react';
import type { LiveVolume } from '@/lib/bindings';
import { driveLabel, formatBytes } from '@/lib/format';
import { useRegisterVolume } from '../api';
import { describeVolume, suggestName } from '../labels';
import { VolumeNameDialog } from './VolumeNameDialog';

export function AvailableVolumeList({ volumes }: { volumes: LiveVolume[] }) {
  const [selected, setSelected] = useState<LiveVolume | null>(null);
  const register = useRegisterVolume();

  const open = (volume: LiveVolume) => {
    register.reset();
    setSelected(volume);
  };

  return (
    <>
      <Card>
        {volumes.map((volume, index) => (
          <Fragment key={volume.guidPath}>
            {index > 0 && <Divider />}
            <AvailableVolumeRow volume={volume} onRegister={() => open(volume)} />
          </Fragment>
        ))}
      </Card>
      <VolumeNameDialog
        open={selected !== null}
        title="Registrovat disk"
        description={
          <>
            Pojmenuj disk tak, abys ho poznal. Do kořene disku se zapíše skrytá složka{' '}
            <code>.databackupstudio</code>, podle které ho aplikace pozná pod jakýmkoli písmenem.
          </>
        }
        initialName={selected ? suggestName(selected) : ''}
        submitLabel="Registrovat"
        pending={register.isPending}
        error={register.error}
        onSubmit={(name) =>
          selected &&
          register.mutate(
            { guidPath: selected.guidPath, name },
            { onSuccess: () => setSelected(null) },
          )
        }
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function AvailableVolumeRow({
  volume,
  onRegister,
}: {
  volume: LiveVolume;
  onRegister: () => void;
}) {
  const Icon = volume.isSystem ? ComputerRounded : volume.isExternal ? UsbRounded : StorageRounded;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2 }}>
      <Icon aria-hidden sx={{ color: 'text.secondary' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>
          {driveLabel(volume.mountPoint)} {volume.label || 'Bez jmenovky'}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {describeVolume(volume)} · volno {formatBytes(volume.freeBytes)} z{' '}
          {formatBytes(volume.totalBytes)}
        </Typography>
      </Box>
      {volume.isSystem ? (
        <Chip label="Systémový disk" variant="outlined" size="small" />
      ) : (
        <Button
          variant={volume.isExternal ? 'contained' : 'outlined'}
          startIcon={<AddRounded />}
          onClick={onRegister}
        >
          Registrovat
        </Button>
      )}
    </Box>
  );
}
