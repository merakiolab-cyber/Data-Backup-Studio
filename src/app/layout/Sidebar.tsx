import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import {
  DatabaseBackup,
  HardDrive,
  History,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { ds } from '@/app/theme/theme';
import { useVolumes } from '@/features/volumes/api';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Nested screens that keep this item highlighted. */
  children?: string;
}

const mainItems: NavItem[] = [
  { to: '/', label: 'Přehled', icon: LayoutGrid, children: '/ulohy' },
  { to: '/disky', label: 'Disky', icon: HardDrive },
  { to: '/historie', label: 'Historie', icon: History },
];

const settingsItem: NavItem = { to: '/nastaveni', label: 'Nastavení', icon: Settings };

export function Sidebar() {
  const volumes = useVolumes();
  const needsAttention =
    volumes.data?.registered.filter((v) => v.status.state === 'needsConfirmation').length ?? 0;

  return (
    <Box
      component="nav"
      aria-label="Hlavní navigace"
      sx={{
        width: 96,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        py: 3.5,
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 52,
          height: 52,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: ds(theme).ink,
          color: ds(theme).mint,
        })}
      >
        <DatabaseBackup size={24} />
      </Box>

      <Box
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 0.75,
          borderRadius: '999px',
          bgcolor: ds(theme).sheet,
          border: `1px solid ${ds(theme).sheetBorder}`,
          backdropFilter: 'blur(20px)',
        })}
      >
        {mainItems.map((item) => (
          <RailLink key={item.to} item={item} badge={item.to === '/disky' ? needsAttention : 0} />
        ))}
      </Box>

      <Box sx={{ flex: 1 }} />
      <RailLink item={settingsItem} badge={0} />
    </Box>
  );
}

function RailLink({ item, badge }: { item: NavItem; badge: number }) {
  const Icon = item.icon;
  const { pathname } = useLocation();
  const inChild = item.children !== undefined && pathname.startsWith(item.children);
  return (
    <Tooltip title={item.label} placement="right">
      <NavLink
        to={item.to}
        end={item.to === '/'}
        aria-label={item.label}
        style={{ borderRadius: 999 }}
      >
        {({ isActive: exact }) => {
          const isActive = exact || inChild;
          return (
            <Badge
              badgeContent={badge}
              overlap="circular"
              sx={(theme) => ({
                '& .MuiBadge-badge': {
                  bgcolor: ds(theme).badge,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  fontSize: '0.6875rem',
                },
              })}
            >
              <ButtonBase
                component="span"
                aria-current={isActive ? 'page' : undefined}
                sx={(theme) => ({
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  color: isActive ? ds(theme).ink : ds(theme).inkMuted,
                  bgcolor: isActive ? ds(theme).surface : 'transparent',
                  boxShadow: isActive ? ds(theme).shadow : 'none',
                  transition: theme.transitions.create(['background-color', 'color'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                  '&:hover': {
                    color: ds(theme).ink,
                    bgcolor: isActive ? undefined : ds(theme).muted,
                  },
                })}
              >
                <Icon size={22} />
              </ButtonBase>
            </Badge>
          );
        }}
      </NavLink>
    </Tooltip>
  );
}
