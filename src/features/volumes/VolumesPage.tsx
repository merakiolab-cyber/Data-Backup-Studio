import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { HardDrive, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ease, spin } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import type { LiveVolume } from '@/lib/bindings';
import { useT } from '@/lib/i18n';
import { useVolumes } from './api';
import { AvailableVolumeList } from './components/AvailableVolumeList';
import { RegisteredVolumeGrid } from './components/RegisteredVolumeGrid';

export function VolumesPage() {
  const { t } = useT();
  const volumes = useVolumes();
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([volumes.refetch(), new Promise((r) => setTimeout(r, 600))]);
    setRefreshing(false);
  };

  return (
    <Page
      title={t.volumes.title}
      description={t.volumes.description}
      actions={
        <Tooltip title={t.volumes.refresh}>
          <IconButton
            aria-label={t.volumes.refresh}
            onClick={refresh}
            disabled={refreshing}
            sx={{
              '& svg': {
                animation: refreshing ? `${spin} 700ms ${ease.standard} infinite` : 'none',
              },
            }}
          >
            <RefreshCw size={20} />
          </IconButton>
        </Tooltip>
      }
    >
      {volumes.isPending && <LinearProgress aria-label={t.common.loadingVolumes} />}
      {volumes.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => volumes.refetch()}>
              {t.common.retry}
            </Button>
          }
        >
          {volumes.error.message}
        </Alert>
      )}
      {volumes.data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Section
            title={t.volumes.targets}
            {...(volumes.data.registered.length >= 2 ? { subtitle: t.volumes.reorderHint } : {})}
            aside={<Stat value={volumes.data.registered.length} label={t.volumes.registered} />}
          >
            {volumes.data.registered.length === 0 ? (
              <EmptyState
                icon={<HardDrive size={32} />}
                title={t.volumes.emptyTitle}
                description={t.volumes.emptyDescription}
              />
            ) : (
              <RegisteredVolumeGrid views={volumes.data.registered} />
            )}
          </Section>
          <AvailableSections volumes={volumes.data.available} />
        </Box>
      )}
    </Page>
  );
}

function AvailableSections({ volumes }: { volumes: LiveVolume[] }) {
  const { t } = useT();
  const external = volumes.filter((v) => v.isExternal);
  const internal = volumes.filter((v) => !v.isExternal);

  return (
    <>
      <Section
        title={t.volumes.external}
        subtitle={t.volumes.externalHint}
        aside={<Stat value={external.length} label={t.volumes.connected} />}
      >
        {external.length === 0 ? (
          <Card sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t.volumes.noExternal}
            </Typography>
          </Card>
        ) : (
          <AvailableVolumeList volumes={external} />
        )}
      </Section>
      {internal.length > 0 && (
        <Section
          title={t.volumes.internal}
          subtitle={t.volumes.internalHint}
          aside={<Stat value={internal.length} label={t.volumes.disksUnit} />}
        >
          <AvailableVolumeList volumes={internal} />
        </Section>
      )}
    </>
  );
}
