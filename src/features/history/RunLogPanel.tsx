import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';
import { ds } from '@/app/theme/theme';
import { useT } from '@/lib/i18n';
import { filterRunLog, LOG_ACTION_KINDS, type LogActionKind } from './runLogFilter';

export function RunLogPanel({ text }: { text: string }) {
  const { t } = useT();
  const [active, setActive] = useState<Set<LogActionKind>>(() => new Set(LOG_ACTION_KINDS));
  const labels: Record<LogActionKind, string> = {
    copy: t.history.logFilterCopy,
    update: t.history.logFilterUpdate,
    delete: t.history.logFilterDelete,
    dir: t.history.logFilterDir,
    failure: t.history.logFilterFailure,
  };

  const filtered = useMemo(() => filterRunLog(text, active), [text, active]);
  const allSelected = active.size === LOG_ACTION_KINDS.length;

  const toggle = (kind: LogActionKind) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <Box
        role="group"
        aria-label={t.history.logFilterGroup}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, alignItems: 'center' }}
      >
        <Chip
          label={t.history.logFilterAll}
          clickable
          variant={allSelected ? 'filled' : 'outlined'}
          onClick={() => setActive(new Set(LOG_ACTION_KINDS))}
        />
        {LOG_ACTION_KINDS.map((kind) => (
          <Chip
            key={kind}
            label={labels[kind]}
            clickable
            variant={active.has(kind) ? 'filled' : 'outlined'}
            onClick={() => toggle(kind)}
          />
        ))}
      </Box>
      {active.size === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t.history.logFilterNoneHint}
        </Typography>
      ) : (
        <Box
          component="pre"
          aria-label={t.history.log}
          sx={(theme) => ({
            m: 0,
            flex: 1,
            minHeight: { xs: 280, md: 420, xl: 520 },
            p: { xs: 2, md: 2.5 },
            overflow: 'auto',
            borderRadius: '20px',
            bgcolor: ds(theme).muted,
            fontFamily: 'ui-monospace, Consolas, monospace',
            fontSize: { xs: '0.8125rem', md: '0.875rem', xl: '0.9375rem' },
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          })}
        >
          {filtered}
        </Box>
      )}
    </Box>
  );
}
