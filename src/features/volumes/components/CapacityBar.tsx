import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { formatBytes } from '@/lib/format';

interface CapacityBarProps {
  totalBytes: number;
  freeBytes: number;
}

export function CapacityBar({ totalBytes, freeBytes }: CapacityBarProps) {
  const usedPercent = totalBytes > 0 ? ((totalBytes - freeBytes) / totalBytes) * 100 : 0;
  const nearlyFull = usedPercent >= 90;

  return (
    <Box>
      <LinearProgress
        variant="determinate"
        value={usedPercent}
        color={nearlyFull ? 'warning' : 'primary'}
        aria-label="Zaplnění disku"
        sx={{ height: 6, borderRadius: 999 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        Volno {formatBytes(freeBytes)} z {formatBytes(totalBytes)}
        {nearlyFull && ' · disk je skoro plný'}
      </Typography>
    </Box>
  );
}
