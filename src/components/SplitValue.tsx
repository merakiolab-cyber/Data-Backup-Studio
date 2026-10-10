import Box from '@mui/material/Box';
import { useCountUp } from '@/lib/useCountUp';

/** Screen readers get the final value instead of the counting digits. */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;

interface SplitValueProps {
  /** e.g. `1,2 TB` → **1**,2 TB */
  value: string;
  size?: number;
  /** Counts the leading integer up from 0 (and between later changes). */
  animate?: boolean;
}

/** Large number with the leading integer emphasized and the rest light, like `68,575.00`. */
export function SplitValue({ value, size = 44, animate = false }: SplitValueProps) {
  const match = /^(\d[\d\u00a0 ]*)(.*)$/.exec(value);
  const strong = (match?.[1] ?? value).trimEnd();
  const rest = match?.[2] ?? '';
  const integer = /^\d+$/.test(strong) ? Number(strong) : null;
  const counted = useCountUp(integer ?? 0, animate && integer !== null);

  return (
    <Box
      component="span"
      sx={{
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.03em',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <Box component="span" sx={{ fontWeight: 600 }} aria-hidden={animate || undefined}>
        {animate && integer !== null ? counted : strong}
      </Box>
      {rest && (
        <Box
          component="span"
          sx={{ fontWeight: 300, opacity: 0.55 }}
          aria-hidden={animate || undefined}
        >
          {/^[,./]/.test(rest) ? rest : `\u00a0${rest.trim()}`}
        </Box>
      )}
      {animate && <span style={visuallyHidden}>{value}</span>}
    </Box>
  );
}
