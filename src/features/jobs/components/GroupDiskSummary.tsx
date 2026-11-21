import Typography from '@mui/material/Typography';
import { useQueries } from '@tanstack/react-query';
import { useVolumes } from '@/features/volumes/api';
import type { JobView } from '@/lib/bindings';
import { formatBytes } from '@/lib/format';
import { fmt, useT } from '@/lib/i18n';
import { jobSizeQuery } from '../api';

interface DiskLine {
  key: string;
  text: string;
  tooBig: boolean;
}

/** Per target disk: how much the group's jobs add up to vs. the disk's free / total space. */
export function GroupDiskSummary({ jobs }: { jobs: JobView[] }) {
  const { t, locale } = useT();
  const volumes = useVolumes();
  const sizes = useQueries({
    queries: jobs.map((view) =>
      jobSizeQuery(view.job.id, view.source.status.state === 'connected'),
    ),
  });

  const byTarget = new Map<string, { name: string; indexes: number[] }>();
  jobs.forEach((view, index) => {
    const id = view.job.target.volumeId;
    const entry = byTarget.get(id) ?? { name: view.target.volumeName, indexes: [] };
    entry.indexes.push(index);
    byTarget.set(id, entry);
  });

  const lines: DiskLine[] = [];
  for (const [volumeId, { name, indexes }] of byTarget) {
    const results = indexes.map((index) => sizes[index]);
    const pending = results.some((result) => result?.isLoading);
    const known = results.flatMap((result) => (result?.data ? [result.data.totalBytes] : []));
    const total = known.reduce((sum, bytes) => sum + bytes, 0);
    const incomplete = known.length < indexes.length;
    if (known.length === 0 && !pending) {
      continue;
    }

    const sizeText = pending
      ? t.jobs.sizeCalculating
      : incomplete
        ? fmt(t.jobs.sizeAtLeast, { size: formatBytes(total, locale) })
        : formatBytes(total, locale);
    const live = volumes.data?.registered.find((entry) => entry.volume.id === volumeId)?.live;
    const tooBig = !pending && live ? total > live.totalBytes : false;
    const text = live
      ? fmt(t.jobs.groupDisk, {
          name,
          size: sizeText,
          free: formatBytes(live.freeBytes, locale),
          total: formatBytes(live.totalBytes, locale),
        })
      : fmt(t.jobs.groupDiskOff, { name, size: sizeText });
    lines.push({ key: volumeId, text: tooBig ? `${text} ${t.jobs.groupTooBig}` : text, tooBig });
  }

  if (lines.length === 0) {
    return null;
  }
  return (
    <>
      {lines.map((line) => (
        <Typography
          key={line.key}
          variant="caption"
          color={line.tooBig ? 'error' : 'text.secondary'}
          component="p"
          noWrap
          title={line.text}
        >
          {line.text}
        </Typography>
      ))}
    </>
  );
}
