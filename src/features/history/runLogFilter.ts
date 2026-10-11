/** Action line prefixes in run logs (engine `log_action`, Czech). */
export const LOG_ACTION_KINDS = ['copy', 'update', 'delete', 'dir', 'failure'] as const;

export type LogActionKind = (typeof LOG_ACTION_KINDS)[number];

const PREFIX: Record<LogActionKind, string> = {
  copy: 'kopie',
  update: 'aktualizace',
  delete: 'smazat',
  dir: 'složka',
  failure: 'selhání',
};

export function classifyLogLine(line: string): LogActionKind | 'meta' {
  const trimmed = line.trimStart();
  if (trimmed.length === 0) {
    return 'meta';
  }
  for (const kind of LOG_ACTION_KINDS) {
    if (trimmed.startsWith(PREFIX[kind])) {
      return kind;
    }
  }
  if (
    trimmed.startsWith('Data Backup Studio') ||
    trimmed.startsWith('úloha:') ||
    trimmed.startsWith('režim:') ||
    trimmed.startsWith('zahájeno:') ||
    trimmed.startsWith('stav:') ||
    trimmed.startsWith('zkopírováno:') ||
    trimmed.startsWith('dokončeno:') ||
    trimmed.startsWith('… začátek')
  ) {
    return 'meta';
  }
  return 'meta';
}

/** Keeps header/footer lines; filters action lines by selected kinds. */
export function filterRunLog(text: string, active: ReadonlySet<LogActionKind>): string {
  if (active.size === LOG_ACTION_KINDS.length) {
    return text;
  }
  if (active.size === 0) {
    return '';
  }
  return text
    .split('\n')
    .filter((line) => {
      const kind = classifyLogLine(line);
      return kind === 'meta' || active.has(kind);
    })
    .join('\n');
}
