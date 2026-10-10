import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { ds } from '@/app/theme/theme';
import type { DesignTokens } from '@/app/theme/tokens';
import { IconBubble } from '@/components/IconBubble';
import { SplitValue } from '@/components/SplitValue';

type Accent = keyof Pick<DesignTokens, 'mint' | 'lemon' | 'lilac' | 'peach' | 'sky'>;

interface StatTileProps {
  accent: Accent;
  icon: ReactNode;
  value: string;
  label: string;
  /** Vertical stripes texture, used for "not available yet" values. */
  striped?: boolean;
}

export function StatTile({ accent, icon, value, label, striped = false }: StatTileProps) {
  return (
    <Box
      sx={(theme) => {
        const t = ds(theme);
        return {
          minHeight: 188,
          p: 2.5,
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: t.onAccent,
          bgcolor: t[accent],
          backgroundImage: striped
            ? 'repeating-linear-gradient(90deg, rgba(18,20,23,0.07) 0 2px, transparent 2px 9px)'
            : 'none',
        };
      }}
    >
      <IconBubble tone="glass">{icon}</IconBubble>
      <Box>
        <SplitValue value={value} size={48} />
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
