import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { theme } from '@/app/theme/theme';
import type { LiveVolume, VolumesOverview } from '@/lib/bindings';
import { VolumesPage } from './VolumesPage';

const external: LiveVolume = {
  guidPath: '\\\\?\\Volume{00000000-0000-0000-0000-000000000001}\\',
  mountPoint: 'G:\\',
  label: 'Záloha',
  serial: 0x1234abcd,
  fileSystem: 'NTFS',
  driveKind: 'fixed',
  bus: 'usb',
  model: 'WD Elements 25A2',
  totalBytes: 2_000_398_934_016,
  freeBytes: 1_000_000_000_000,
  isSystem: false,
  isExternal: true,
  marker: null,
};

const overview: VolumesOverview = {
  registered: [
    {
      volume: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Fotky 2 TB',
        serial: 0x0bad_f00d,
        guidPath: external.guidPath,
        fileSystem: 'NTFS',
        model: 'Seagate Expansion',
        totalBytes: 2_000_398_934_016,
        registeredAtMs: 0,
      },
      status: { state: 'connected' },
      live: { ...external, mountPoint: 'F:\\', model: 'Seagate Expansion' },
    },
  ],
  available: [
    external,
    { ...external, guidPath: 'sys', mountPoint: 'C:\\', isSystem: true, isExternal: false },
  ],
};

vi.mock('@/lib/bindings', () => ({
  commands: { listVolumes: vi.fn(async () => ({ status: 'ok', data: overview })) },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme}>
        <VolumesPage />
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('VolumesPage', () => {
  it('shows registered volume with its current drive letter', async () => {
    renderPage();
    expect(await screen.findByText('Fotky 2 TB')).toBeInTheDocument();
    expect(screen.getByText('Připojený jako F:')).toBeInTheDocument();
  });

  it('offers registration for external volumes but not for the system volume', async () => {
    renderPage();
    expect(await screen.findByText('G: Záloha')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Registrovat' })).toHaveLength(1);
    expect(screen.getByText('Systémový disk')).toBeInTheDocument();
  });
});
