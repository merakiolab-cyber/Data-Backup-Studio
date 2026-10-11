import Box from '@mui/material/Box';
import { Outlet } from 'react-router';
import { ActiveRunBar } from '@/features/jobs/components/ActiveRunBar';
import { RunJobDialog } from '@/features/jobs/components/RunJobDialog';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
        <Outlet />
      </Box>
      <RunJobDialog />
      <ActiveRunBar />
    </Box>
  );
}
