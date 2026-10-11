import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import {
  FolderSync,
  HardDrive,
  History,
  LayoutGrid,
  type LucideIcon,
  Settings,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { duration, ease, popIn } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { AppLogo } from '@/components/AppLogo';
import { useRuns } from '@/features/history/api';
import { useVolumes } from '@/features/volumes/api';
import { useT } from '@/lib/i18n';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function Sidebar() {
  const { t } = useT();
  const volumes = useVolumes();
  const runs = useRuns();
  const mainItems: NavItem[] = [
    { to: '/', label: t.nav.overview, icon: LayoutGrid },
    { to: '/ulohy', label: t.nav.jobs, icon: FolderSync },
    { to: '/disky', label: t.nav.volumes, icon: HardDrive },
    { to: '/historie', label: t.nav.history, icon: History },
  ];
  const settingsItem: NavItem = { to: '/nastaveni', label: t.nav.settings, icon: Settings };
  const needsAttention =
    volumes.data?.registered.filter((v) => v.status.state === 'needsConfirmation').length ?? 0;
  const failedRuns = runs.data?.filter((run) => run.status === 'failed').length ?? 0;

  return (
    <Box
      component="nav"
      aria-label={t.nav.main}
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
      <Tooltip title={t.nav.app} placement="right">
        <NavLink to="/" end aria-label={t.nav.app} style={{ borderRadius: 12 }}>
          <Box
            sx={(theme) => ({
              width: 52,
              height: 52,
              display: 'grid',
              placeItems: 'center',
              color: ds(theme).ink,
              animation: `${popIn} 500ms ${ease.spring} backwards`,
              '& svg': { transition: `transform ${duration.hover}ms ${ease.spring}` },
              '&:hover svg': { transform: 'scale(1.08)' },
            })}
          >
            <AppLogo size={44} />
          </Box>
        </NavLink>
      </Tooltip>

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
          <RailLink
            key={item.to}
            item={item}
            badge={item.to === '/disky' ? needsAttention : item.to === '/historie' ? failedRuns : 0}
          />
        ))}
      </Box>

      <Box sx={{ flex: 1 }} />
      <RailLink item={settingsItem} badge={0} />
    </Box>
  );
}

function RailLink({ item, badge }: { item: NavItem; badge: number }) {
  const Icon = item.icon;
  return (
    <Tooltip title={item.label} placement="right">
      <NavLink
        to={item.to}
        end={item.to === '/'}
        aria-label={item.label}
        style={{ borderRadius: 999 }}
      >
        {({ isActive }) => (
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
                '& svg': { transition: `transform ${duration.hover}ms ${ease.spring}` },
                '&:hover': {
                  color: ds(theme).ink,
                  bgcolor: isActive ? undefined : ds(theme).muted,
                },
                '&:hover svg': { transform: 'translateY(-2px)' },
              })}
            >
              <Icon size={22} />
            </ButtonBase>
          </Badge>
        )}
      </NavLink>
    </Tooltip>
  );
}
