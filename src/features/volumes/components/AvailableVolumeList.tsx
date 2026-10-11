import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { HardDrive, Monitor, Plus, Usb } from 'lucide-react';
import { useState } from 'react';
import { hoverLift, stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { IconBubble } from '@/components/IconBubble';
import type { LiveVolume } from '@/lib/bindings';
import { driveLabel, formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { useRegisterVolume } from '../api';
import { describeVolume, suggestName } from '../labels';
import { VolumeNameDialog } from './VolumeNameDialog';

export function AvailableVolumeList({ volumes }: { volumes: LiveVolume[] }) {
  const { t } = useT();
  const [selected, setSelected] = useState<LiveVolume | null>(null);
  const register = useRegisterVolume();

  const open = (volume: LiveVolume) => {
    register.reset();
    setSelected(volume);
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ...stagger(40) }}>
        {volumes.map((volume) => (
          <AvailableVolumeRow
            key={volume.guidPath}
            volume={volume}
            onRegister={() => open(volume)}
          />
        ))}
      </Box>
      <VolumeNameDialog
        open={selected !== null}
        title={t.volumes.registerTitle}
        description={t.volumes.registerHint}
        initialName={selected ? suggestName(selected) : ''}
        submitLabel={t.volumes.register}
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
  const { t } = useT();
  const Icon = volume.isSystem ? Monitor : volume.isExternal ? Usb : HardDrive;

  return (
    <Card
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        px: 2.5,
        py: 2,
        ...hoverLift(ds(theme).shadowRaised),
      })}
    >
      <IconBubble size={56} tone="muted">
        <Icon size={24} />
      </IconBubble>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>
          {driveLabel(volume.mountPoint)} {volume.label || t.volumes.unlabeled}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {describeVolume(volume, t)}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', mr: 1, display: { xs: 'none', md: 'block' } }}>
        <Typography variant="subtitle1">{formatBytes(volume.freeBytes)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {fmt(t.volumes.freeOf, { total: formatBytes(volume.totalBytes) })}
        </Typography>
      </Box>
      {volume.isSystem ? (
        <Chip label={t.volumes.system} variant="outlined" />
      ) : (
        <Button
          variant={volume.isExternal ? 'contained' : 'outlined'}
          startIcon={<Plus size={18} />}
          onClick={onRegister}
        >
          {t.volumes.register}
        </Button>
      )}
    </Card>
  );
}
