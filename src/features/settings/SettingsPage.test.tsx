import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { theme } from '@/app/theme/theme';
import type { AppSettings } from '@/lib/bindings';
import { I18nProvider } from '@/lib/i18n';
import { setActiveLocale } from '@/lib/i18n/locale';
import { SettingsPage } from './SettingsPage';

const { settings } = vi.hoisted(() => {
  const settings: AppSettings = {
    copyParallelism: 4,
    mtimeToleranceSecs: 2,
    deleteThresholdPercent: 20,
    verifyCopies: false,
    locale: 'cs',
  };
  return { settings };
});

vi.mock('@/lib/bindings', () => ({
  commands: {
    appInfo: vi.fn(async () => ({
      status: 'ok',
      data: { version: '0.1.0', coreVersion: '0.1.0', dataDir: 'C:\\Demo\\app.databackupstudio' },
    })),
    getSettings: vi.fn(async () => ({ status: 'ok', data: settings })),
    updateSettings: vi.fn(async (next: AppSettings) => ({ status: 'ok' as const, data: next })),
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={theme} defaultMode="system">
        <I18nProvider>
          <SettingsPage />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  afterEach(() => {
    localStorage.removeItem('dbs-locale');
    setActiveLocale('cs');
  });

  it('shows engine knobs, verify toggle and open-data action', async () => {
    renderPage();
    expect(await screen.findByLabelText('Souběžné kopie')).toBeInTheDocument();
    expect(screen.getByLabelText('Tolerance času souboru')).toBeInTheDocument();
    expect(screen.getByLabelText('Práh mazání v Zrcadle')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Ověřit kopie' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Otevřít' })).toBeInTheDocument();
    expect(screen.getByLabelText('Jazyk aplikace')).toBeInTheDocument();
  });

  it('switches the UI to English', async () => {
    renderPage();
    expect(await screen.findByLabelText('Souběžné kopie')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByLabelText('App language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });
});
