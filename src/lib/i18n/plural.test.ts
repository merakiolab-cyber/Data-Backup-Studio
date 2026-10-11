import { catalogs, czechCountForm, plural } from './catalog';

describe('czechCountForm', () => {
  it('follows Czech paucal rules', () => {
    expect(czechCountForm(1)).toBe('one');
    expect(czechCountForm(21)).toBe('one');
    expect([2, 3, 4, 22, 103].map(czechCountForm)).toEqual(['few', 'few', 'few', 'few', 'few']);
    expect([0, 5, 10, 11, 14, 25].map(czechCountForm)).toEqual([
      'other',
      'other',
      'other',
      'other',
      'other',
      'other',
    ]);
  });
});

describe('plural', () => {
  it('declines job counts in Czech', () => {
    const forms = catalogs.cs.jobs.groupCount;
    expect(plural('cs', 1, forms)).toBe('1 úloha');
    expect(plural('cs', 2, forms)).toBe('2 úlohy');
    expect(plural('cs', 10, forms)).toBe('10 úloh');
  });

  it('uses English singular and plural', () => {
    const forms = catalogs.en.jobs.groupCount;
    expect(plural('en', 1, forms)).toBe('1 job');
    expect(plural('en', 2, forms)).toBe('2 jobs');
  });
});
