import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { CopyCheck, FilePlus2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cardGridSx } from '@/app/theme/layout';
import { duration, ease, popIn } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';
import { IconBubble } from '@/components/IconBubble';
import type { BackupMode } from '@/lib/bindings';
import { useT } from '@/lib/i18n';
import { modeLabels } from '../labels';

const icons: Record<BackupMode, ReactNode> = {
  update: <FilePlus2 size={22} />,
  mirror: <CopyCheck size={22} />,
};

const order: BackupMode[] = ['mirror', 'update'];

export function ModePicker({
  value,
  onChange,
}: {
  value: BackupMode;
  onChange: (mode: BackupMode) => void;
}) {
  const { t } = useT();
  const labels = modeLabels(t);
  return (
    <Box role="radiogroup" aria-label={t.mode.group} sx={cardGridSx('compact', 1.5)}>
      {order.map((mode) => {
        const selected = mode === value;
        return (
          <ButtonBase
            key={mode}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode)}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 2,
              p: 2,
              textAlign: 'left',
              borderRadius: '22px',
              border: `1.5px solid ${selected ? 'transparent' : ds(theme).outline}`,
              bgcolor: selected
                ? mode === 'mirror'
                  ? ds(theme).lemon
                  : ds(theme).mint
                : 'transparent',
              color: selected ? ds(theme).onAccent : 'inherit',
              transition: `background-color ${duration.hover}ms ${ease.standard}, border-color ${duration.hover}ms ${ease.standard}, transform ${duration.press}ms ${ease.standard}`,
              '&:hover': { borderColor: selected ? 'transparent' : ds(theme).inkFaint },
              '&.Mui-focusVisible': { outline: `2px solid ${ds(theme).ink}`, outlineOffset: 2 },
            })}
          >
            <Box
              key={String(selected)}
              sx={{ animation: selected ? `${popIn} 360ms ${ease.spring}` : 'none' }}
            >
              <IconBubble size={44} tone={selected ? 'glass' : 'muted'}>
                {icons[mode]}
              </IconBubble>
            </Box>
            <Box>
              <Typography variant="subtitle1">{labels[mode].title}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {labels[mode].description}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
