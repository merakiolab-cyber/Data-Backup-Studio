import RefreshRounded from '@mui/icons-material/RefreshRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import type { LiveVolume } from '@/lib/bindings';
import { useVolumes } from './api';
import { AvailableVolumeList } from './components/AvailableVolumeList';
import { RegisteredVolumeCard } from './components/RegisteredVolumeCard';

export function VolumesPage() {
  const volumes = useVolumes();

  return (
    <>
      <PageHeader
        title="Disky"
        description="Registrované disky poznáme vždy, ať dostanou jakékoli písmeno."
        action={
          <Tooltip title="Načíst disky znovu">
            <IconButton
              aria-label="Načíst disky znovu"
              onClick={() => volumes.refetch()}
              disabled={volumes.isFetching}
            >
              <RefreshRounded />
            </IconButton>
          </Tooltip>
        }
      />
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
        <Stack spacing={5}>
          <Section title="Cílové disky">
            {volumes.data.registered.length === 0 ? (
              <EmptyState
                icon={<StorageRounded />}
                title="Zatím nemáš registrovaný žádný disk"
                description="Připoj externí USB disk a níže ho zaregistruj. Aplikace si ho zapamatuje podle jeho identity, ne podle písmene."
              />
            ) : (
              <Stack spacing={1.5}>
                {volumes.data.registered.map((view) => (
                  <RegisteredVolumeCard key={view.volume.id} view={view} />
                ))}
              </Stack>
            )}
          </Section>
          <AvailableSections volumes={volumes.data.available} />
        </Stack>
      )}
    </>
  );
}

function AvailableSections({ volumes }: { volumes: LiveVolume[] }) {
  const external = volumes.filter((v) => v.isExternal);
  const internal = volumes.filter((v) => !v.isExternal);

  return (
    <>
      <Section
        title="Připojené externí disky"
        subtitle="Nový USB disk se tu objeví do pár sekund po připojení."
      >
        {external.length === 0 ? (
          <Card sx={{ px: 2.5, py: 2 }}>
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
        >
          <AvailableVolumeList volumes={internal} />
        </Section>
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <Typography variant="h4" component="h2">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {children}
      </Stack>
    </section>
  );
}
