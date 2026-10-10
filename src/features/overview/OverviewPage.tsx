import AddRounded from '@mui/icons-material/AddRounded';
import BackupRounded from '@mui/icons-material/BackupRounded';
import Button from '@mui/material/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export function OverviewPage() {
  return (
    <>
      <PageHeader title="Přehled" description="Tvoje zálohovací úlohy a jejich stav." />
      <EmptyState
        icon={<BackupRounded />}
        title="Zatím nemáš žádnou úlohu"
        description="Úloha určuje, kterou složku zálohovat a na který disk. Nastavíš ji jednou, pak už jen spouštíš."
        action={
          <Button variant="contained" startIcon={<AddRounded />} disabled>
            Nová úloha
          </Button>
        }
      />
    </>
  );
}
