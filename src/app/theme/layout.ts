import type { SxProps, Theme } from '@mui/material/styles';

/**
 * Card grids fill the page width: more columns as the window widens; cells use `1fr`.
 * `wide` = job/volume cards; `compact` = stat tiles and similar smaller blocks.
 */
export function cardGridSx(
  variant: 'wide' | 'compact' = 'wide',
  gap: number = 2.5,
): SxProps<Theme> {
  if (variant === 'compact') {
    return {
      display: 'grid',
      gap,
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        lg: 'repeat(3, minmax(0, 1fr))',
      },
    };
  }
  return {
    display: 'grid',
    gap,
    gridTemplateColumns: {
      xs: '1fr',
      sm: 'repeat(2, minmax(0, 1fr))',
      lg: 'repeat(3, minmax(0, 1fr))',
      xl: 'repeat(4, minmax(0, 1fr))',
    },
  };
}
