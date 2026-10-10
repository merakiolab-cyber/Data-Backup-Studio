import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  /** Right side of the heading, typically a `Stat`. */
  aside?: ReactNode;
  children: ReactNode;
}

export function Section({ title, subtitle, aside, children }: SectionProps) {
  return (
    <Box component="section">
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h2" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {aside}
      </Box>
      {children}
    </Box>
  );
}
