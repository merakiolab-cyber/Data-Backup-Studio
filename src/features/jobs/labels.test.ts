import { unchangedFiles } from './labels';

describe('unchangedFiles', () => {
  it('counts source files already matching on the target', () => {
    expect(unchangedFiles(42, 3, 1)).toBe(38);
  });

  it('is zero when the target is empty', () => {
    expect(unchangedFiles(10, 10, 0)).toBe(0);
  });
});
