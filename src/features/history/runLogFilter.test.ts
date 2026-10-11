import { filterRunLog, LOG_ACTION_KINDS, type LogActionKind } from './runLogFilter';

const sample = `Data Backup Studio – záznam běhu
úloha: Fotky
zahájeno: 2026-01-01
kopie  Album\\a.jpg  100
aktualizace  Album\\b.jpg  50
smazat  Album\\old.jpg
složka  Album\\Nové
selhání  něco se pokazilo

stav: hotovo
zkopírováno: 1  aktualizováno: 1  smazáno: 1
dokončeno: 2026-01-01`;

function only(...kinds: LogActionKind[]): Set<LogActionKind> {
  return new Set(kinds);
}

describe('filterRunLog', () => {
  it('returns full text when every kind is active', () => {
    expect(filterRunLog(sample, new Set(LOG_ACTION_KINDS))).toBe(sample);
  });

  it('keeps meta lines when filtering actions', () => {
    const out = filterRunLog(sample, only('copy'));
    expect(out).toContain('úloha: Fotky');
    expect(out).toContain('kopie  Album\\a.jpg');
    expect(out).not.toContain('aktualizace');
    expect(out).not.toContain('smazat');
    expect(out).toContain('stav: hotovo');
  });

  it('returns empty body when nothing is selected', () => {
    expect(filterRunLog(sample, new Set())).toBe('');
  });
});
