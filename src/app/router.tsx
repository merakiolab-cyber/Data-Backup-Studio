import { createHashRouter, Navigate } from 'react-router';
import { HistoryPage } from '@/features/history/HistoryPage';
import { JobEditorPage } from '@/features/jobs/JobEditorPage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { VolumesPage } from '@/features/volumes/VolumesPage';
import { AppShell } from './layout/AppShell';

export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'ulohy/nova', element: <JobEditorPage /> },
      { path: 'ulohy/:id', element: <JobEditorPage /> },
      { path: 'disky', element: <VolumesPage /> },
      { path: 'historie', element: <HistoryPage /> },
      { path: 'nastaveni', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
