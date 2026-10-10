import { useEffect, useRef, useState } from 'react';
import { duration } from '@/app/theme/motion';

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/** Animates an integer from the currently shown value (0 on mount) to `target` with an ease-out curve. */
export function useCountUp(target: number, enabled = true): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const shown = useRef(value);

  useEffect(() => {
    const show = (next: number) => {
      shown.current = next;
      setValue(next);
    };
    if (!enabled || prefersReducedMotion() || shown.current === target) {
      show(target);
      return;
    }
    const start = performance.now();
    const origin = shown.current;
    let frame = requestAnimationFrame(function step() {
      // The rAF timestamp may use a different time origin than performance.now().
      const t = Math.min(Math.max((performance.now() - start) / duration.value, 0), 1);
      show(Math.round(origin + (target - origin) * (1 - (1 - t) ** 3)));
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    // rAF pauses in hidden or minimized windows; the final value must not depend on it.
    const settle = setTimeout(() => {
      cancelAnimationFrame(frame);
      show(target);
    }, duration.value + 50);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [target, enabled]);

  return value;
}
