import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { theme } from '@/app/theme/theme';
import type { JobView, VolumesOverview } from '@/lib/bindings';
import { OverviewPage } from './OverviewPage';

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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <OverviewPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('OverviewPage', () => {
  it('shows job cards with current paths and readiness', async () => {
    renderPage();
    const ready = await screen.findByRole('article', { name: 'Fotky' });
    expect(within(ready).getByText('G:\\Záloha\\Fotky')).toBeInTheDocument();
    expect(within(ready).getByText('Připraveno')).toBeInTheDocument();

    const waiting = screen.getByRole('article', { name: 'Archiv' });
    expect(within(waiting).getByText('\\Záloha\\Fotky')).toBeInTheDocument();
    expect(within(waiting).getByText('Disk nepřipojený')).toBeInTheDocument();
    expect(screen.getByText('Úlohy připravené ke spuštění')).toBeInTheDocument();
  });
});
