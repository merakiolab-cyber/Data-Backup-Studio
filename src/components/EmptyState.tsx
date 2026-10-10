import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { IconBubble } from './IconBubble';

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
        py: 6,
      }}
    >
      <IconBubble size={72} tone="muted">
        {icon}
      </IconBubble>
      <Box>
        <Typography variant="h3" component="h2">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 440 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Card>
  );
}
