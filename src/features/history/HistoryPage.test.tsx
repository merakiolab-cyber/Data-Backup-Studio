import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { theme } from '@/app/theme/theme';
import type { RunSummary } from '@/lib/bindings';
import { HistoryPage } from './HistoryPage';

function run(
  partial: Partial<RunSummary> & Pick<RunSummary, 'id' | 'jobId' | 'jobName'>,
): RunSummary {
  return {
    mode: 'mirror',
    status: 'done',
    startedAtMs: Date.now() - 60_000,
    finishedAtMs: Date.now() - 50_000,
    copied: 2,
    updated: 0,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied: 4_000,
    errorCount: 0,
    ...partial,
  };
}

const runs: RunSummary[] = [
  run({
    id: 'd4d4d4d4-0000-4000-8000-000000000001',
    jobId: 'c3c3c3c3-0000-4000-8000-000000000001',
    jobName: 'Fotky',
    copied: 3,
    updated: 1,
  }),
  run({
    id: 'd4d4d4d4-0000-4000-8000-000000000002',
    jobId: 'c3c3c3c3-0000-4000-8000-000000000002',
    jobName: 'Dokumenty',
    status: 'failed',
    copied: 0,
    errorCount: 1,
  }),
];

vi.mock('@/lib/bindings', () => ({
  commands: {
    listRuns: vi.fn(async () => ({ status: 'ok', data: runs })),
    getRun: vi.fn(async () => ({
      status: 'ok',
      data: { run: runs[1], errors: ['Cílový disk není připojený.'] },
    })),
    getRunLog: vi.fn(async () => ({
      status: 'ok',
      data: 'selhání  Cílový disk není připojený.\nstav: selhalo',
    })),
    openRunLog: vi.fn(async () => ({ status: 'ok', data: null })),
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <HistoryPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('HistoryPage', () => {
  it('lists runs and filters by job', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /Fotky, Hotovo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dokumenty, Selhalo/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fotky' }));
    expect(screen.getByRole('button', { name: /Fotky, Hotovo/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Dokumenty, Selhalo/ })).not.toBeInTheDocument();
  });

  it('opens the error detail', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Dokumenty, Selhalo/ }));
    expect(await screen.findByText('Cílový disk není připojený.')).toBeInTheDocument();
    expect(screen.getByLabelText('Záznam běhu')).toHaveTextContent('stav: selhalo');
  });
});
