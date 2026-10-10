import Box from '@mui/material/Box';

interface SplitValueProps {
  /** e.g. `1,2 TB` → **1**,2 TB */
  value: string;
  size?: number;
}

/** Large number with the leading integer emphasized and the rest light, like `68,575.00`. */
export function SplitValue({ value, size = 44 }: SplitValueProps) {
  const match = /^(\d[\d\u00a0 ]*)(.*)$/.exec(value);
  const strong = match?.[1] ?? value;
  const rest = match?.[2] ?? '';

  return (
    <Box
      component="span"
      sx={{ fontSize: size, lineHeight: 1, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}
    >
      <Box component="span" sx={{ fontWeight: 600 }}>
        {strong.trimEnd()}
      </Box>
      {rest && (
        <Box component="span" sx={{ fontWeight: 300, opacity: 0.55 }}>
          {/^[,./]/.test(rest) ? rest : `\u00a0${rest.trim()}`}
        </Box>
      )}
    </Box>
  );
}
