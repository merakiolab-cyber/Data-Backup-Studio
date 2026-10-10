import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { HardDrive, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import type { LiveVolume } from '@/lib/bindings';
import { useVolumes } from './api';
import { AvailableVolumeList } from './components/AvailableVolumeList';
import { RegisteredVolumeCard } from './components/RegisteredVolumeCard';

export function VolumesPage() {
  const volumes = useVolumes();

  return (
    <Page
      title="Disky"
      description="Registrované disky poznáme vždy, ať dostanou jakékoli písmeno."
      actions={
        <Tooltip title="Načíst disky znovu">
          <IconButton
            aria-label="Načíst disky znovu"
            onClick={() => volumes.refetch()}
            disabled={volumes.isFetching}
          >
            <RefreshCw size={20} />
          </IconButton>
        </Tooltip>
      }
    >
      {volumes.isPending && <LinearProgress aria-label="Načítám disky" />}
      {volumes.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => volumes.refetch()}>
              Zkusit znovu
            </Button>
          }
        >
          {volumes.error.message}
        </Alert>
      )}
      {volumes.data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Section
            title="Cílové disky"
            aside={<Stat value={volumes.data.registered.length} label="registrované" />}
          >
            {volumes.data.registered.length === 0 ? (
              <EmptyState
                icon={<HardDrive size={32} />}
                title="Zatím nemáš registrovaný žádný disk"
                description="Připoj externí USB disk a níže ho zaregistruj. Aplikace si ho zapamatuje podle jeho identity, ne podle písmene."
              />
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: 2,
                }}
              >
                {volumes.data.registered.map((view) => (
                  <RegisteredVolumeCard key={view.volume.id} view={view} />
                ))}
              </Box>
            )}
          </Section>
          <AvailableSections volumes={volumes.data.available} />
        </Box>
      )}
    </Page>
  );
}

function AvailableSections({ volumes }: { volumes: LiveVolume[] }) {
  const external = volumes.filter((v) => v.isExternal);
  const internal = volumes.filter((v) => !v.isExternal);

  return (
    <>
      <Section
        title="Externí disky"
        subtitle="Nový USB disk se tu objeví do pár sekund po připojení."
        aside={<Stat value={external.length} label="připojené" />}
      >
        {external.length === 0 ? (
          <Card sx={{ px: 3, py: 2.5 }}>
            <Typography variant="body2" color="text.secondary">
              Žádný neregistrovaný externí disk není připojený.
            </Typography>
          </Card>
        ) : (
          <AvailableVolumeList volumes={external} />
        )}
      </Section>
      {internal.length > 0 && (
        <Section
          title="Interní disky"
          subtitle="Jako cíl zálohy jde použít i interní disk, jen ne systémový."
          aside={<Stat value={internal.length} label="disků" />}
        >
          <AvailableVolumeList volumes={internal} />
        </Section>
      )}
    </>
  );
}
