import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
        px: 4,
        py: 8,
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          width: 72,
          height: 72,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          bgcolor: (theme.vars ?? theme).palette.m3.primaryContainer,
          color: (theme.vars ?? theme).palette.m3.onPrimaryContainer,
          '& svg': { fontSize: 36 },
        })}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="h4" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 420 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Card>
  );
}
