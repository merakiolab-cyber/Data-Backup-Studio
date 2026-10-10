import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import { FolderSync, Plus } from 'lucide-react';
import { Link } from 'react-router';
import { stagger } from '@/app/theme/motion';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { Section } from '@/components/Section';
import { Stat } from '@/components/Stat';
import { useJobs } from './api';
import { JobCard } from './components/JobCard';
import { jobsLabel } from './labels';

export function NewJobButton() {
  return (
    <Button component={Link} to="/ulohy/nova" variant="contained" startIcon={<Plus size={18} />}>
      Nová úloha
    </Button>
  );
}

export function JobsPage() {
  const jobs = useJobs();
  const views = jobs.data ?? [];

  return (
    <Page
      title="Úlohy"
      description="Co se zálohuje, kam a jakým režimem."
      actions={views.length > 0 ? <NewJobButton /> : undefined}
    >
      {jobs.isPending && <LinearProgress aria-label="Načítám úlohy" />}
      {jobs.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => jobs.refetch()}>
              Zkusit znovu
            </Button>
          }
        >
          {jobs.error.message}
        </Alert>
      )}
      {jobs.data &&
        (views.length > 0 ? (
          <Section
            title="Zálohovací úlohy"
            aside={<Stat value={views.length} label={jobsLabel(views.length)} />}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: 2,
                ...stagger(),
              }}
            >
              {views.map((view) => (
                <JobCard key={view.job.id} view={view} />
              ))}
            </Box>
          </Section>
        ) : (
          <EmptyState
            icon={<FolderSync size={32} />}
            title="Zatím nemáš žádnou úlohu"
            description="Úloha určuje, kterou složku zálohovat a na který disk. Nastavíš ji jednou, pak už jen spouštíš."
            action={<NewJobButton />}
          />
        ))}
    </Page>
  );
}
