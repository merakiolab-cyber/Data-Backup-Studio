import { keyframes } from '@mui/material/styles';

/**
 * Motion tokens. Everything is CSS-only and switched off globally under
 * `prefers-reduced-motion: reduce` (see `MuiCssBaseline` in theme.ts).
 */
export const ease = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Fast start, long soft landing – for things entering the screen. */
  emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
  /** Slight overshoot – for small "pop" feedback. */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const duration = { press: 120, hover: 200, enter: 420, fold: 520, value: 700 } as const;

export const riseIn = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
`;

export const popIn = keyframes`
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: none; }
`;

export const dialogIn = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: none; }
`;

export const spin = keyframes`
  to { transform: rotate(360deg); }
`;

/** Soft expanding ring around a "connected / ready" icon. */
export const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(18, 20, 23, 0.28); }
  70% { box-shadow: 0 0 0 7px rgba(18, 20, 23, 0); }
  100% { box-shadow: 0 0 0 0 rgba(18, 20, 23, 0); }
`;

export const enter = (delayMs = 0) => ({
  animation: `${riseIn} ${duration.enter}ms ${ease.emphasized} ${delayMs}ms backwards`,
});

/** Children of a grid or list rise in one after another (only on mount, not on refetch). */
export function stagger(stepMs = 50, max = 12) {
  const delays: Record<string, { animationDelay: string }> = {};
  for (let i = 1; i <= max; i += 1) {
    delays[`& > :nth-of-type(${i})`] = { animationDelay: `${(i - 1) * stepMs}ms` };
  }
  return {
    // `backwards`, not `both`: a kept end state would override hover transforms afterwards.
    '& > *': { animation: `${riseIn} ${duration.enter}ms ${ease.emphasized} backwards` },
    [`& > :nth-of-type(n + ${max + 1})`]: { animationDelay: `${max * stepMs}ms` },
    ...delays,
  };
}

/** Card that lifts slightly under the pointer. */
export const hoverLift = (raisedShadow: string) => ({
  transition: `transform ${duration.hover}ms ${ease.standard}, box-shadow ${duration.hover}ms ${ease.standard}`,
  '&:hover': { transform: 'translateY(-3px)', boxShadow: raisedShadow },
});
