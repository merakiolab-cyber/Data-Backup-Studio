import Box from '@mui/material/Box';
import { CircleAlert, CircleCheck, Unplug } from 'lucide-react';
import { ease, pulseRing } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import type { VolumeStatus } from '@/lib/bindings';
import { driveLabel } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';

interface VolumeStatusChipProps {
  status: VolumeStatus;
  mountPoint: string | undefined;
}

/** Status pill: always icon + text, never color alone. */
export function VolumeStatusChip({ status, mountPoint }: VolumeStatusChipProps) {
  const { t } = useT();
  const { icon, label } =
    status.state === 'connected'
      ? {
          icon: <CircleCheck size={16} />,
          label: mountPoint
            ? fmt(t.volumes.connectedAs, { letter: driveLabel(mountPoint) })
            : t.volumes.connectedPlain,
        }
      : status.state === 'needsConfirmation'
        ? { icon: <CircleAlert size={16} />, label: t.volumes.needsCheck }
        : { icon: <Unplug size={16} />, label: t.volumes.disconnected };
  const onAccent = status.state !== 'disconnected';

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        height: 34,
        px: 1.5,
        borderRadius: '999px',
        fontSize: '0.8125rem',
        fontWeight: 600,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        color: onAccent ? ds(theme).onAccent : ds(theme).inkMuted,
        bgcolor: onAccent ? 'rgba(255, 255, 255, 0.55)' : ds(theme).muted,
      })}
    >
      <Box
        component="span"
        sx={{
          display: 'flex',
          borderRadius: '50%',
          animation:
            status.state === 'connected' ? `${pulseRing} 2.4s ${ease.standard} infinite` : 'none',
        }}
      >
        {icon}
      </Box>
      {label}
    </Box>
  );
}
