import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded';
import UsbOffRounded from '@mui/icons-material/UsbOffRounded';
import Chip from '@mui/material/Chip';
import type { Theme } from '@mui/material/styles';
import type { VolumeStatus } from '@/lib/bindings';
import { driveLabel } from '@/lib/format';

interface VolumeStatusChipProps {
  status: VolumeStatus;
  mountPoint: string | undefined;
}

export function VolumeStatusChip({ status, mountPoint }: VolumeStatusChipProps) {
  if (status.state === 'connected') {
    return (
      <Chip
        icon={<CheckCircleRounded />}
        label={mountPoint ? `Připojený jako ${driveLabel(mountPoint)}` : 'Připojený'}
        sx={(theme: Theme) => {
          const m3 = (theme.vars ?? theme).palette.m3;
          return { bgcolor: m3.successContainer, '& .MuiChip-icon': { color: m3.success } };
        }}
      />
    );
  }
  if (status.state === 'needsConfirmation') {
    return (
      <Chip
        icon={<ErrorOutlineRounded />}
        label="Potřebuje ověřit"
        sx={(theme: Theme) => {
          const m3 = (theme.vars ?? theme).palette.m3;
          return { bgcolor: m3.warningContainer, '& .MuiChip-icon': { color: m3.warning } };
        }}
      />
    );
  }
  return <Chip icon={<UsbOffRounded />} label="Nepřipojený" variant="outlined" />;
}
