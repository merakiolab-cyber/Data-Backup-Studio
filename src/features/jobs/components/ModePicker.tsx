import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import { CopyCheck, FilePlus2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ds } from '@/app/theme/theme';
import { IconBubble } from '@/components/IconBubble';
import type { BackupMode } from '@/lib/bindings';
import { modeLabels } from '../labels';

const icons: Record<BackupMode, ReactNode> = {
  update: <FilePlus2 size={22} />,
  mirror: <CopyCheck size={22} />,
};

const order: BackupMode[] = ['update', 'mirror'];

export function ModePicker({
  value,
  onChange,
}: {
  value: BackupMode;
  onChange: (mode: BackupMode) => void;
}) {
  return (
    <Box
      role="radiogroup"
      aria-label="Režim zálohy"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 1.5,
      }}
    >
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
              transition: 'background-color 150ms, border-color 150ms',
              '&:hover': { borderColor: selected ? 'transparent' : ds(theme).inkFaint },
              '&.Mui-focusVisible': { outline: `2px solid ${ds(theme).ink}`, outlineOffset: 2 },
            })}
          >
            <IconBubble size={44} tone={selected ? 'glass' : 'muted'}>
              {icons[mode]}
            </IconBubble>
            <Box>
              <Typography variant="subtitle1">{modeLabels[mode].title}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {modeLabels[mode].description}
              </Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
