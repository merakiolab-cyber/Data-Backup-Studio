import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { CalendarClock, FolderSync, HardDrive, Play } from 'lucide-react';
import { Link } from 'react-router';
import { cardGridSx } from '@/app/theme/layout';
import { enter, stagger } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { EmptyState } from '@/components/EmptyState';
import { Page } from '@/components/Page';
import { useRuns } from '@/features/history/api';
import { useJobs } from '@/features/jobs/api';
import { NewJobButton } from '@/features/jobs/JobsPage';
import { isJobReady } from '@/features/jobs/labels';
import { useRunSession } from '@/features/jobs/runSession';
import { useVolumes } from '@/features/volumes/api';
import { formatWhen } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { BackupFreshnessCard } from './BackupFreshnessCard';
import { jobFreshnessRows } from './freshness';
import { StatsCard } from './StatsCard';
import { StatTile } from './StatTile';
import { backupStats, overviewStats } from './stats';

export function OverviewPage() {
  const { t } = useT();
  const volumes = useVolumes();
  const jobs = useJobs();
  const runs = useRuns();
  const { enqueue } = useRunSession();
  const registered = volumes.data?.registered ?? [];
  const connected = registered.filter((v) => v.status.state === 'connected').length;
  const jobViews = jobs.data?.jobs ?? [];
  const backups = backupStats(runs.data ?? []);
  const readyJobs = jobViews.filter(isJobReady);
  const ready = readyJobs.length;
  const freshnessRows = jobFreshnessRows(jobViews, runs.data ?? []);

  return (
    <Page
      title={t.overview.title}
      description={t.overview.description}
      actions={
        jobViews.length > 0 ? (
          <Tooltip
            title={ready === 0 ? t.overview.runNone : fmt(t.overview.runAllHint, { count: ready })}
          >
            <span>
              <Button
                variant="contained"
                startIcon={<Play size={16} />}
                disabled={ready === 0}
                onClick={() =>
                  enqueue(readyJobs.map((view) => ({ id: view.job.id, name: view.job.name })))
                }
                sx={(theme) => ({
                  '&&': { bgcolor: ds(theme).mint, color: ds(theme).onAccent },
                  '&:hover': { bgcolor: ds(theme).mint, filter: 'brightness(0.96)' },
                  '&.Mui-disabled': { bgcolor: ds(theme).muted, color: ds(theme).inkFaint },
                })}
              >
                {t.overview.runAll}
              </Button>
            </span>
          </Tooltip>
        ) : undefined
      }
    >
      <Box sx={{ ...cardGridSx('compact', 2), mb: 5, ...stagger(70) }}>
        <StatTile
          accent="mint"
          icon={<HardDrive size={22} />}
          value={`${connected}/${registered.length}`}
          label={t.overview.connectedTargets}
        />
        <StatTile
          accent="lemon"
          icon={<FolderSync size={22} />}
          value={jobViews.length ? `${ready}/${jobViews.length}` : '0'}
          label={jobViews.length ? t.overview.readyJobs : t.overview.jobCount}
        />
        <StatTile
          accent={backups.last?.status === 'cancelled' ? 'lemon' : backups.last ? 'peach' : 'lilac'}
          icon={<CalendarClock size={22} />}
          value={backups.last ? formatWhen(backups.last.finishedAtMs) : '—'}
          label={
            backups.last
              ? fmt(t.overview.lastBackupNamed, { name: backups.last.jobName })
              : t.overview.lastBackup
          }
          striped={!backups.last}
        />
      </Box>

      {jobViews.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <BackupFreshnessCard rows={freshnessRows} />
        </Box>
      )}

      {(registered.length > 0 || jobViews.length > 0) && (
        <Box sx={{ mb: 5, ...enter(140) }}>
          <StatsCard stats={overviewStats(registered, jobViews)} backups={backups} />
        </Box>
      )}

      {volumes.data && registered.length === 0 && jobViews.length === 0 && (
        <EmptyState
          icon={<HardDrive size={32} />}
          title={t.overview.emptyDiskTitle}
          description={t.overview.emptyDiskDescription}
          action={
            <Button component={Link} to="/disky" variant="contained">
              {t.overview.goToVolumes}
            </Button>
          }
        />
      )}
      {jobs.data && jobViews.length === 0 && registered.length > 0 && (
        <EmptyState
          icon={<FolderSync size={32} />}
          title={t.overview.emptyJobTitle}
          description={t.overview.emptyJobDescription}
          action={<NewJobButton />}
        />
      )}
    </Page>
  );
}
