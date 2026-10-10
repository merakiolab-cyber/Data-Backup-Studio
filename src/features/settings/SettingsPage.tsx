import DarkModeRounded from '@mui/icons-material/DarkModeRounded';
import LightModeRounded from '@mui/icons-material/LightModeRounded';
import SettingsBrightnessRounded from '@mui/icons-material/SettingsBrightnessRounded';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import { useColorScheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { useAppInfo } from './api';

type ThemeMode = 'system' | 'light' | 'dark';

export function SettingsPage() {
  const { mode, setMode } = useColorScheme();
  const appInfo = useAppInfo();

  return (
    <>
      <PageHeader title="Nastavení" />
      <Card>
        <SettingRow title="Vzhled" description="Světlý, tmavý, nebo podle systému.">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode ?? 'system'}
            onChange={(_, value: ThemeMode | null) => value && setMode(value)}
            aria-label="Vzhled aplikace"
          >
            <ToggleButton value="system">
              <SettingsBrightnessRounded fontSize="small" sx={{ mr: 1 }} />
              Systém
            </ToggleButton>
            <ToggleButton value="light">
              <LightModeRounded fontSize="small" sx={{ mr: 1 }} />
              Světlý
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkModeRounded fontSize="small" sx={{ mr: 1 }} />
              Tmavý
            </ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>
        <Divider />
        <SettingRow
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
      </Card>
    </>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, px: 3, py: 2.5 }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}
