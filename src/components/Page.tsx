import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { enter } from '@/app/theme/motion';
import { ds } from '@/app/theme/theme';

interface PageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Page title on the gradient backdrop and a translucent scrollable content sheet below it. */
export function Page({ title, description, actions, children }: PageProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 4, pt: 4, pb: 3, ...enter() }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h1">{title}</Typography>
          {description && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ display: 'flex', gap: 1 }}>{actions}</Box>}
      </Box>
      <Box
        sx={(theme) => ({
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          mr: 2,
          mb: 2,
          borderRadius: '32px',
          bgcolor: ds(theme).sheet,
          border: `1px solid ${ds(theme).sheetBorder}`,
          backdropFilter: 'blur(24px)',
        })}
      >
        <Box sx={{ maxWidth: 1120, mx: 'auto', p: 4, ...enter(60) }}>{children}</Box>
      </Box>
    </Box>
  );
}
