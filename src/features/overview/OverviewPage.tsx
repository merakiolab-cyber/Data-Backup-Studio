import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { CalendarClock, FolderSync, HardDrive, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { stagger } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import { useJobs } from '@/features/jobs/api';
import { JobCard } from '@/features/jobs/components/JobCard';
import { useVolumes } from '@/features/volumes/api';
import { StatTile } from './StatTile';

export function OverviewPage() {
  const volumes = useVolumes();
  const jobs = useJobs();
  const registered = volumes.data?.registered ?? [];
  const connected = registered.filter((v) => v.status.state === 'connected').length;
  const jobViews = jobs.data ?? [];
  const ready = jobViews.filter(
    (v) => v.source.status.state === 'connected' && v.target.status.state === 'connected',
  ).length;

  const newJob = (
    <Button component={Link} to="/ulohy/nova" variant="contained" startIcon={<Plus size={18} />}>
      Nová úloha
    </Button>
  );

  return (
    <Page title="Přehled" description="Tvoje zálohovací úlohy a jejich stav.">
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

      <Section
        title="Úlohy"
        aside={
          jobViews.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Stat value={jobViews.length} label={jobsLabel(jobViews.length)} />
              {newJob}
            </Box>
          ) : (
            <Stat value={0} label="úloh" />
          )
        }
      >
        {jobViews.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 2,
              ...stagger(),
            }}
          >
            {jobViews.map((view) => (
              <JobCard key={view.job.id} view={view} />
            ))}
          </Box>
        ) : (
          <EmptyState
            icon={<FolderSync size={32} />}
            title="Zatím nemáš žádnou úlohu"
            description="Úloha určuje, kterou složku zálohovat a na který disk. Nastavíš ji jednou, pak už jen spouštíš."
            action={jobs.isPending ? undefined : newJob}
          />
        )}
      </Section>
    </Page>
  );
}

function jobsLabel(count: number): string {
  if (count === 1) {
    return 'úloha';
  }
  return count < 5 ? 'úlohy' : 'úloh';
}
