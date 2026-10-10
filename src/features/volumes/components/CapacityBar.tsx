import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { ease } from '@/app/theme/motion';
import { SplitValue } from '@/components/SplitValue';
import { formatBytes } from '@/lib/format';

interface CapacityBarProps {
  totalBytes: number;
  freeBytes: number;
}

/** Free space as a big split number with a slim bar; meant for pastel cards. */
export function CapacityBar({ totalBytes, freeBytes }: CapacityBarProps) {
  const usedPercent = totalBytes > 0 ? ((totalBytes - freeBytes) / totalBytes) * 100 : 0;
  const nearlyFull = usedPercent >= 90;
  // Start empty and fill right after mount so the bar grows in. A timer, not rAF:
  // rAF pauses in hidden windows and the bar would stay empty.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setShown(usedPercent), 30);
    return () => clearTimeout(timer);
  }, [usedPercent]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1.5 }}>
        <SplitValue value={formatBytes(freeBytes)} size={36} />
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          volno z {formatBytes(totalBytes)}
          {nearlyFull && ' · skoro plný'}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={shown}
        aria-label="Zaplnění disku"
        sx={{
          height: 6,
          bgcolor: 'rgba(255, 255, 255, 0.55)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'currentColor',
            transition: `transform 900ms ${ease.emphasized} 200ms`,
          },
        }}
      />
    </Box>
  );
}
