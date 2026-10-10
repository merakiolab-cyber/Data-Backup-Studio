import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { theme } from '@/app/theme/theme';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <ThemeProvider theme={theme}>
        <EmptyState
          icon={<span />}
          title="Žádná data"
          description="Popis"
          action={<button type="button">Akce</button>}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Žádná data' })).toBeInTheDocument();
    expect(screen.getByText('Popis')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Akce' })).toBeInTheDocument();
  });
});
