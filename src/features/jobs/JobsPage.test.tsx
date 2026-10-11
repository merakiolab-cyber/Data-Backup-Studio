import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { theme } from '@/app/theme/theme';
import { OverviewPage } from '@/features/overview/OverviewPage';
import type { JobView, RunSummary, VolumesOverview } from '@/lib/bindings';
import { I18nProvider } from '@/lib/i18n';
import { JobsPage } from './JobsPage';
import { RunSessionProvider } from './runSession';

const volumes: VolumesOverview = { registered: [], available: [] };

function job(id: string, name: string, targetConnected: boolean): JobView {
  return {
    job: {
      id,
      name,
      source: { volumeId: 'b2b2b2b2-0000-4000-8000-000000000001', relPath: 'Fotky' },
      target: { volumeId: 'a1a1a1a1-0000-4000-8000-000000000001', relPath: 'Záloha\\Fotky' },
      mode: 'mirror',
      excludes: ['*.tmp'],
      createdAtMs: 0,
      updatedAtMs: 0,
    },
    source: { volumeName: 'Data', status: { state: 'connected' }, path: 'D:\\Fotky' },
    target: {
      volumeName: 'WD Elements 2 TB',
      status: { state: targetConnected ? 'connected' : 'disconnected' },
      path: targetConnected ? 'G:\\Záloha\\Fotky' : null,
    },
  };
}

const jobs = [
  job('c3c3c3c3-0000-4000-8000-000000000001', 'Fotky', true),
  job('c3c3c3c3-0000-4000-8000-000000000002', 'Archiv', false),
];

const lastRun: RunSummary = {
  id: 'd4d4d4d4-0000-4000-8000-000000000001',
  jobId: 'c3c3c3c3-0000-4000-8000-000000000001',
  jobName: 'Fotky',
  mode: 'mirror',
  status: 'done',
  startedAtMs: Date.now() - 60_000,
  finishedAtMs: Date.now() - 50_000,
  copied: 3,
  updated: 1,
  deleted: 0,
  dirsCreated: 0,
  bytesCopied: 12_000,
  errorCount: 0,
};

vi.mock('@/lib/bindings', () => ({
  commands: {
    listVolumes: vi.fn(async () => ({ status: 'ok', data: volumes })),
    listJobs: vi.fn(async () => ({ status: 'ok', data: { groups: [], jobs } })),
    listRuns: vi.fn(async () => ({ status: 'ok', data: [lastRun] })),
    getRun: vi.fn(async () => ({ status: 'ok', data: { run: lastRun, errors: [] } })),
  },
  events: {
    runProgressEvent: { listen: vi.fn(async () => () => undefined) },
    volumesChangedEvent: { listen: vi.fn(async () => () => undefined) },
  },
}));

function renderPage(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <I18nProvider>
          <RunSessionProvider>
            <MemoryRouter>{page}</MemoryRouter>
          </RunSessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('JobsPage', () => {
  it('shows job cards with current paths and readiness', async () => {
    renderPage(<JobsPage />);
    const ready = await screen.findByRole('article', { name: 'Fotky' });
    expect(within(ready).getByText('G:\\Záloha\\Fotky')).toBeInTheDocument();
    expect(within(ready).getByText('Připraveno')).toBeInTheDocument();
    expect(within(ready).getByText(/Hotovo dnes/)).toBeInTheDocument();

    const waiting = screen.getByRole('article', { name: 'Archiv' });
    expect(within(waiting).getByText('\\Záloha\\Fotky')).toBeInTheDocument();
    expect(within(waiting).getByText('Disk nepřipojený')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spustit vše' })).toBeEnabled();
  });

  it('selects every job, or only the jobs in one group', async () => {
    renderPage(<JobsPage />);
    await screen.findByRole('article', { name: 'Fotky' });
    fireEvent.click(screen.getByRole('button', { name: 'Vybrat skupinu Bez skupiny' }));
    expect(screen.getByRole('article', { name: 'Fotky' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('article', { name: 'Archiv' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zrušit výběr skupiny Bez skupiny' }));
    expect(screen.getByRole('article', { name: 'Fotky' })).toHaveAttribute(
      'aria-selected',
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Vybrat všechny úlohy' }));
    expect(screen.getByRole('article', { name: 'Archiv' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Zrušit výběr' })).toBeInTheDocument();
  });

  it('renames the batch button when a job tile is selected', async () => {
    renderPage(<JobsPage />);
    const ready = await screen.findByRole('article', { name: 'Fotky' });
    fireEvent.pointerDown(ready, { button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(ready, { button: 0, clientX: 22, clientY: 21 });
    fireEvent.click(ready);
    expect(ready).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Spustit označené' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Seskupit' })).toBeEnabled();
  });
});

describe('OverviewPage', () => {
  it('summarizes jobs without listing them', async () => {
    renderPage(<OverviewPage />);
    expect(await screen.findByText('Úlohy připravené ke spuštění')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Statistiky' })).toBeInTheDocument();
    expect(screen.getByText('Zálohy v historii')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spustit vše' })).toBeEnabled();
    expect(screen.queryByRole('article', { name: 'Fotky' })).not.toBeInTheDocument();
  });
});
