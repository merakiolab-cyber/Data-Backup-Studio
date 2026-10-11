import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { RunSessionProvider } from '@/features/jobs/runSession';
import { I18nProvider } from '@/lib/i18n';
import { router } from './router';
import { theme } from './theme/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline enableColorScheme />
        <I18nProvider>
          <RunSessionProvider>
            <RouterProvider router={router} />
          </RunSessionProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
