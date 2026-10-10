import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useColorScheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Info, Moon, Palette, Sun, SunMoon } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconBubble } from '@/components/IconBubble';
import { Page } from '@/components/Page';
import { useAppInfo } from './api';

type ThemeMode = 'system' | 'light' | 'dark';

export function SettingsPage() {
  const { mode, setMode } = useColorScheme();
  const appInfo = useAppInfo();

  return (
    <Page title="Nastavení">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <SettingRow
          icon={<Palette size={22} />}
          title="Vzhled"
          description="Světlý, tmavý, nebo podle systému."
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode ?? 'system'}
            onChange={(_, value: ThemeMode | null) => value && setMode(value)}
            aria-label="Vzhled aplikace"
          >
            <ToggleButton value="system">
              <SunMoon size={18} />
              Systém
            </ToggleButton>
            <ToggleButton value="light">
              <Sun size={18} />
              Světlý
            </ToggleButton>
            <ToggleButton value="dark">
              <Moon size={18} />
              Tmavý
            </ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>
        <SettingRow
          icon={<Info size={22} />}
          title="O aplikaci"
          description="Data Backup Studio – offline zálohování na externí disky."
        >
          <Typography variant="body2" color="text.secondary">
            {appInfo.data
              ? `Verze ${appInfo.data.version}`
              : appInfo.isError
                ? 'Verze nezjištěna'
                : '…'}
          </Typography>
        </SettingRow>
      </Box>
    </Page>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 3, py: 2.5 }}>
      <IconBubble tone="muted">{icon}</IconBubble>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {children}
    </Card>
  );
}
