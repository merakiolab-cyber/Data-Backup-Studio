import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { SplitValue } from './SplitValue';

interface StatProps {
  value: string | number;
  label: string;
  size?: number;
}

/** `67 Items` style counter: big value with a small muted label. */
export function Stat({ value, label, size = 40 }: StatProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <SplitValue value={String(value)} size={size} animate />
      <Typography variant="body1" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
