import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { ds } from '@/app/theme/theme';

interface FormBlockProps {
  step: number;
  title: string;
  description?: string;
  sx?: SxProps<Theme>;
  children: ReactNode;
}

/** Numbered white card grouping one part of the job editor. */
export function FormBlock({ step, title, description, sx, children }: FormBlockProps) {
  return (
    <Box
      component="fieldset"
      sx={[
        (theme) => ({
          m: 0,
          p: 3,
          minWidth: 0,
          height: '100%',
          boxSizing: 'border-box',
          border: 'none',
          borderRadius: '28px',
          bgcolor: ds(theme).surface,
          boxShadow: ds(theme).shadow,
        }),
        ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
      ]}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 32,
            height: 32,
            flexShrink: 0,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: '0.875rem',
            bgcolor: ds(theme).muted,
          })}
        >
          {step}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="legend" variant="h3" sx={{ p: 0 }}>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {children}
    </Box>
  );
}
