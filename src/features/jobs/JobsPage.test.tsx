import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { theme } from '@/app/theme/theme';
import { OverviewPage } from '@/features/overview/OverviewPage';
import type { JobView, VolumesOverview } from '@/lib/bindings';
import { JobsPage } from './JobsPage';

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

vi.mock('@/lib/bindings', () => ({
  commands: {
    listVolumes: vi.fn(async () => ({ status: 'ok', data: volumes })),
    listJobs: vi.fn(async () => ({ status: 'ok', data: jobs })),
  },
}));

function renderPage(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>{page}</MemoryRouter>
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

    const waiting = screen.getByRole('article', { name: 'Archiv' });
    expect(within(waiting).getByText('\\Záloha\\Fotky')).toBeInTheDocument();
    expect(within(waiting).getByText('Disk nepřipojený')).toBeInTheDocument();
  });
});

describe('OverviewPage', () => {
  it('summarizes jobs without listing them', async () => {
    renderPage(<OverviewPage />);
    expect(await screen.findByText('Úlohy připravené ke spuštění')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Statistiky' })).toBeInTheDocument();
    expect(screen.queryByRole('article', { name: 'Fotky' })).not.toBeInTheDocument();
  });
});
