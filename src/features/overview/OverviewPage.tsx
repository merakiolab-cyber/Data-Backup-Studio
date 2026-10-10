import Box from '@mui/material/Box';
import { CalendarClock, FolderSync, HardDrive } from 'lucide-react';
import { enter, stagger } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { useJobs } from '@/features/jobs/api';
import { NewJobButton } from '@/features/jobs/JobsPage';
import { useVolumes } from '@/features/volumes/api';
import { StatsCard } from './StatsCard';
import { StatTile } from './StatTile';
import { overviewStats } from './stats';

export function OverviewPage() {
  const volumes = useVolumes();
  const jobs = useJobs();
  const registered = volumes.data?.registered ?? [];
  const connected = registered.filter((v) => v.status.state === 'connected').length;
  const jobViews = jobs.data ?? [];
  const ready = jobViews.filter(
    (v) => v.source.status.state === 'connected' && v.target.status.state === 'connected',
  ).length;

  return (
    <Page title="Přehled" description="Stav tvých disků a záloh na jednom místě.">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 2,
          mb: 5,
          ...stagger(70),
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
          value={jobViews.length ? `${ready}/${jobViews.length}` : '0'}
          label={jobViews.length ? 'Úlohy připravené ke spuštění' : 'Zálohovací úlohy'}
        />
        <StatTile
          accent="lilac"
          icon={<CalendarClock size={22} />}
          value="—"
          label="Poslední záloha"
          striped
        />
      </Box>

      {(registered.length > 0 || jobViews.length > 0) && (
        <Box sx={{ mb: 5, ...enter(140) }}>
          <StatsCard stats={overviewStats(registered, jobViews)} />
        </Box>
      )}

      {jobs.data && jobViews.length === 0 && (
        <EmptyState
          icon={<FolderSync size={32} />}
          title="Zatím nemáš žádnou úlohu"
          description="Úloha určuje, kterou složku zálohovat a na který disk. Nastavíš ji jednou, pak už jen spouštíš."
          action={<NewJobButton />}
        />
      )}
    </Page>
  );
}
