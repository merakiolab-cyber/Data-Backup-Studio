import { renderHook, waitFor } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  it('counts up to the target and follows later changes', async () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 12 },
    });
    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(12));

    rerender({ target: 3 });
    await waitFor(() => expect(result.current).toBe(3));
  });

  it('animates when data arrives after an initial zero', async () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 0 },
      reactStrictMode: true,
    });
    rerender({ target: 1 });
    await waitFor(() => expect(result.current).toBe(1));
  });

  it('shows the target immediately when disabled', () => {
    const { result } = renderHook(() => useCountUp(7, false));
    expect(result.current).toBe(7);
  });
});
