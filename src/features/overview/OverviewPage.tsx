import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { CalendarClock, FolderSync, HardDrive, Plus } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import { useVolumes } from '@/features/volumes/api';
import { StatTile } from './StatTile';

export function OverviewPage() {
  const volumes = useVolumes();
  const registered = volumes.data?.registered ?? [];
  const connected = registered.filter((v) => v.status.state === 'connected').length;

  return (
    <Page title="Přehled" description="Tvoje zálohovací úlohy a jejich stav.">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 2,
          mb: 5,
        }}
      >
        <StatTile
          accent="mint"
          icon={<HardDrive size={22} />}
          value={`${connected}/${registered.length}`}
          label="Připojené cílové disky"
        />
        <StatTile
          accent="lemon"
          icon={<FolderSync size={22} />}
          value="0"
          label="Zálohovací úlohy"
        />
        <StatTile
          accent="lilac"
          icon={<CalendarClock size={22} />}
          value="—"
          label="Poslední záloha"
          striped
        />
      </Box>

      <Section title="Úlohy" aside={<Stat value={0} label="úloh" />}>
        <EmptyState
          icon={<FolderSync size={32} />}
          title="Zatím nemáš žádnou úlohu"
          description="Úloha určuje, kterou složku zálohovat a na který disk. Nastavíš ji jednou, pak už jen spouštíš."
          action={
            <Button variant="contained" startIcon={<Plus size={18} />} disabled>
              Nová úloha
            </Button>
          }
        />
      </Section>
    </Page>
  );
}
