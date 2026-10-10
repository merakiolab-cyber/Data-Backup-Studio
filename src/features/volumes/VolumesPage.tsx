import StorageRounded from '@mui/icons-material/StorageRounded';
import UsbRounded from '@mui/icons-material/UsbRounded';
import Button from '@mui/material/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function VolumesPage() {
  return (
    <>
      <PageHeader
        title="Disky"
        description="Registrované disky poznáme vždy, ať dostanou jakékoli písmeno."
      />
      <EmptyState
        icon={<StorageRounded />}
        title="Zatím nemáš registrovaný žádný disk"
        description="Připoj externí USB disk a zaregistruj ho. Aplikace si ho zapamatuje podle jeho identity, ne podle písmene."
        action={
          <Button variant="contained" startIcon={<UsbRounded />} disabled>
            Registrovat disk
          </Button>
        }
      />
    </>
  );
}
