import Box from '@mui/material/Box';
import { Outlet } from 'react-router';
import { NavigationRail } from './NavigationRail';

export function AppShell() {
  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <NavigationRail />
      <Box component="main" sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto', px: 4, py: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
