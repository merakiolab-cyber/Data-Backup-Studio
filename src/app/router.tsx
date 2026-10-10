import { createHashRouter, Navigate } from 'react-router';
import { HistoryPage } from '@/features/history/HistoryPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { VolumesPage } from '@/features/volumes/VolumesPage';
import { AppShell } from './layout/AppShell';

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'disky', element: <VolumesPage /> },
      { path: 'historie', element: <HistoryPage /> },
      { path: 'nastaveni', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
