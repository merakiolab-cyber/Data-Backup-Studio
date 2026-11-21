import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { formatBytes } from '@/lib/format';
import { fmt, plural, useT } from '@/lib/i18n';
import { useFolderSize } from '../api';

/** Tells whether the chosen source fits into the free space of the chosen target disk. */
export function FitCheck({
  sourcePath,
  excludes,
  targetFreeBytes,
}: {
  /** Current absolute source path; `null` until a folder is picked / when its disk is offline. */
  sourcePath: string | null;
  excludes: string[];
  /** Free bytes of the connected target disk; `null` when none is chosen or connected. */
  targetFreeBytes: number | null;
}) {
  const { t, locale } = useT();
  const size = useFolderSize(sourcePath, excludes);

  let body: React.ReactNode;
  if (sourcePath === null || (targetFreeBytes === null && !size.data)) {
    body = <Alert severity="info">{t.editor.fitPickBoth}</Alert>;
  } else if (size.isError) {
    body = (
      <Alert severity="warning">{fmt(t.editor.fitFailed, { error: size.error.message })}</Alert>
    );
  } else if (!size.data) {
    body = (
      <Alert severity="info" icon={<CircularProgress size={18} />}>
        {t.editor.fitMeasuring}
      </Alert>
    );
  } else {
    const sizeText = formatBytes(size.data.totalBytes, locale);
    const files = plural(locale, size.data.fileCount, t.jobs.fileCount);
    if (targetFreeBytes === null) {
      body = <Alert severity="info">{fmt(t.editor.fitDiskOff, { size: sizeText, files })}</Alert>;
    } else {
      const diff = targetFreeBytes - size.data.totalBytes;
      const fits = diff >= 0;
      body = (
        <Alert severity={fits ? 'success' : 'error'}>
          {fmt(fits ? t.editor.fitOk : t.editor.fitNo, {
            size: sizeText,
            files,
            free: formatBytes(targetFreeBytes, locale),
            left: formatBytes(diff, locale),
            missing: formatBytes(-diff, locale),
          })}
        </Alert>
      );
    }
  }

  return (
    <Box aria-live="polite" sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant="subtitle2" component="h3">
        {t.editor.fitTitle}
      </Typography>
      {body}
      <Typography variant="caption" color="text.secondary">
        {t.editor.fitNote}
      </Typography>
    </Box>
  );
}
