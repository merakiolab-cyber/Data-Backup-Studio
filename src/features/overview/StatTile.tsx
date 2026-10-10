import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { duration, ease, hoverLift } from '@/app/theme/motion';
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
          ...hoverLift(t.shadowRaised),
          '& .tile-icon': { transition: `transform ${duration.hover * 2}ms ${ease.spring}` },
          '&:hover .tile-icon': { transform: 'rotate(-10deg) scale(1.08)' },
        };
      }}
    >
      <Box className="tile-icon" sx={{ alignSelf: 'flex-start' }}>
        <IconBubble tone="glass">{icon}</IconBubble>
      </Box>
      <Box>
        <SplitValue value={value} size={48} animate />
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
