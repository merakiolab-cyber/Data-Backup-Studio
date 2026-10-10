import DashboardRounded from '@mui/icons-material/DashboardRounded';
import HistoryRounded from '@mui/icons-material/HistoryRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import StorageRounded from '@mui/icons-material/StorageRounded';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router';

interface NavItem {
  to: string;
  label: string;
  icon: ReactElement;
}

const items: NavItem[] = [
  { to: '/', label: 'Přehled', icon: <DashboardRounded /> },
  { to: '/disky', label: 'Disky', icon: <StorageRounded /> },
  { to: '/historie', label: 'Historie', icon: <HistoryRounded /> },
  { to: '/nastaveni', label: 'Nastavení', icon: <SettingsRounded /> },
];

export function NavigationRail() {
  return (
    <Box
      component="nav"
      aria-label="Hlavní navigace"
      sx={{
        width: 88,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        pt: 3,
        bgcolor: 'background.default',
        borderRight: 1,
        borderColor: 'divider',
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={{ textDecoration: 'none' }}
        >
          {({ isActive }) => <RailButton item={item} active={isActive} />}
        </NavLink>
      ))}
    </Box>
  );
}

function RailButton({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <ButtonBase
      component="span"
      aria-current={active ? 'page' : undefined}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        width: 72,
        borderRadius: 2,
        color: 'text.secondary',
        '&:hover .rail-indicator': { bgcolor: active ? undefined : 'action.hover' },
      }}
    >
      <Box
        className="rail-indicator"
        sx={(theme) => ({
          width: 56,
          height: 32,
          borderRadius: 999,
          display: 'grid',
          placeItems: 'center',
          transition: theme.transitions.create('background-color', {
            duration: theme.transitions.duration.shorter,
          }),
          bgcolor: active ? (theme.vars ?? theme).palette.m3.secondaryContainer : 'transparent',
          color: active ? (theme.vars ?? theme).palette.m3.onSecondaryContainer : 'inherit',
        })}
      >
        {item.icon}
      </Box>
      <Typography
        variant="caption"
        sx={{ fontWeight: active ? 600 : 500, color: active ? 'text.primary' : 'inherit' }}
      >
        {item.label}
      </Typography>
    </ButtonBase>
  );
}
