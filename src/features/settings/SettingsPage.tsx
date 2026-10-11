import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Slider from '@mui/material/Slider';
import Switch from '@mui/material/Switch';
import { useColorScheme } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import {
  Download,
  FolderOpen,
  Info,
  Languages,
  Moon,
  Palette,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  SunMoon,
  Upload,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { IconBubble } from '@/components/IconBubble';
import { Page } from '@/components/Page';
import type { AppSettings, UiLocale } from '@/lib/bindings';
import { fmt, useT } from '@/lib/i18n';
import {
  exportConfigFile,
  importConfigFile,
  openDataDir,
  useAppInfo,
  useSettings,
  useUpdateSettings,
} from './api';

type ThemeMode = 'system' | 'light' | 'dark';

export function SettingsPage() {
  const { t, setLocale } = useT();
  const { mode, setMode } = useColorScheme();
  const appInfo = useAppInfo();
  const settings = useSettings();
  const save = useUpdateSettings();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<AppSettings>) => {
    if (!settings.data) {
      return;
    }
    save.mutate(
      { ...settings.data, ...patch },
      {
        onSuccess: () => setError(null),
        onError: (err) => setError(err.message),
      },
    );
  };

  const exportFile = async () => {
    setError(null);
    try {
      if (await exportConfigFile()) {
        setNotice(t.settings.exportOk);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.settings.exportFail);
    }
  };

  const importFile = async () => {
    setError(null);
    if (!window.confirm(t.settings.importConfirm)) {
      return;
    }
    try {
      if (await importConfigFile()) {
        setNotice(t.settings.importOk);
        await queryClient.invalidateQueries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.settings.importFail);
    }
  };

  const changeLocale = (locale: UiLocale) => {
    setLocale(locale);
    update({ locale });
  };

  return (
    <Page title={t.settings.title}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {notice && (
          <Alert severity="success" onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <SettingRow
          icon={<Palette size={22} />}
          title={t.settings.appearance}
          description={t.settings.appearanceHint}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={mode ?? 'system'}
            onChange={(_, value: ThemeMode | null) => value && setMode(value)}
            aria-label={t.settings.appearanceGroup}
          >
            <ToggleButton value="system">
              <SunMoon size={18} />
              {t.settings.themeSystem}
            </ToggleButton>
            <ToggleButton value="light">
              <Sun size={18} />
              {t.settings.themeLight}
            </ToggleButton>
            <ToggleButton value="dark">
              <Moon size={18} />
              {t.settings.themeDark}
            </ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>

        <SettingRow
          icon={<Languages size={22} />}
          title={t.settings.language}
          description={t.settings.languageHint}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={settings.data?.locale ?? 'cs'}
            onChange={(_, value: UiLocale | null) => value && changeLocale(value)}
            aria-label={t.settings.languageGroup}
          >
            <ToggleButton value="cs">{t.settings.czech}</ToggleButton>
            <ToggleButton value="en">{t.settings.english}</ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>

        {settings.data && (
          <>
            <SettingSlider
              title={t.settings.copies}
              description={t.settings.copiesHint}
              value={settings.data.copyParallelism}
              min={1}
              max={8}
              unit=""
              onChange={(copyParallelism) => update({ copyParallelism })}
            />
            <SettingSlider
              title={t.settings.tolerance}
              description={t.settings.toleranceHint}
              value={settings.data.mtimeToleranceSecs}
              min={0}
              max={10}
              unit=" s"
              onChange={(mtimeToleranceSecs) => update({ mtimeToleranceSecs })}
            />
            <SettingSlider
              title={t.settings.threshold}
              description={t.settings.thresholdHint}
              value={settings.data.deleteThresholdPercent}
              min={5}
              max={80}
              unit=" %"
              onChange={(deleteThresholdPercent) => update({ deleteThresholdPercent })}
            />
            <SettingRow
              icon={<ShieldCheck size={22} />}
              title={t.settings.verify}
              description={t.settings.verifyHint}
            >
              <Switch
                checked={settings.data.verifyCopies ?? false}
                onChange={(_, verifyCopies) => update({ verifyCopies })}
                slotProps={{ input: { 'aria-label': t.settings.verifyLabel } }}
              />
            </SettingRow>
          </>
        )}

        <SettingRow
          icon={<SlidersHorizontal size={22} />}
          title={t.settings.export}
          description={t.settings.exportHint}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Download size={16} />} onClick={() => void exportFile()}>
              {t.settings.exportBtn}
            </Button>
            <Button startIcon={<Upload size={16} />} onClick={() => void importFile()}>
              {t.settings.importBtn}
            </Button>
          </Box>
        </SettingRow>

        <SettingRow
          icon={<ScrollText size={22} />}
          title={t.settings.logs}
          description={t.settings.logsHint}
        >
          <Button
            startIcon={<FolderOpen size={16} />}
            onClick={() => {
              void openDataDir().catch((err: unknown) => {
                setError(err instanceof Error ? err.message : t.settings.openFail);
              });
            }}
          >
            {t.common.open}
          </Button>
        </SettingRow>
        <SettingRow
          icon={<Info size={22} />}
          title={t.settings.about}
          description={t.settings.aboutHint}
        >
          <Typography variant="body2" color="text.secondary">
            {appInfo.data
              ? fmt(t.settings.version, { version: appInfo.data.version })
              : appInfo.isError
                ? t.settings.versionUnknown
                : '…'}
          </Typography>
        </SettingRow>
      </Box>
    </Page>
  );
}

function SettingSlider({
  title,
  description,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <Card sx={{ px: 3, py: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 1 }}>
        <IconBubble tone="muted">
          <SlidersHorizontal size={22} />
        </IconBubble>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>
        <Typography variant="h3" component="p" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
          {unit}
        </Typography>
      </Box>
      <Slider
        value={value}
        min={min}
        max={max}
        step={1}
        valueLabelDisplay="off"
        onChange={(_, next) => typeof next === 'number' && onChange(next)}
        aria-label={title}
      />
    </Card>
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
