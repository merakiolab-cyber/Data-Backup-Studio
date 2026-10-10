import Box from '@mui/material/Box';
import type { ReactNode } from 'react';
import { ds } from '@/app/theme/theme';

type Tone = 'surface' | 'muted' | 'glass';

interface IconBubbleProps {
  children: ReactNode;
  size?: number;
  tone?: Tone;
}

/** Decorative round icon holder; `glass` is meant for pastel backgrounds. */
export function IconBubble({ children, size = 48, tone = 'surface' }: IconBubbleProps) {
  return (
    <Box
      aria-hidden
      sx={(theme) => {
        const t = ds(theme);
        const tones: Record<Tone, object> = {
          surface: { bgcolor: t.surface, border: `1px solid ${t.outline}`, color: t.ink },
          muted: { bgcolor: t.muted, color: t.ink },
          glass: {
            bgcolor: 'rgba(255, 255, 255, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            color: t.onAccent,
          },
        };
        return {
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          ...tones[tone],
        };
      }}
    >
      {children}
    </Box>
  );
}
