import type { LocatedFolder } from '@/lib/bindings';
import { emptyForm, toInput, withSource } from './jobForm';

const folder: LocatedFolder = {
  source: { kind: 'new', guidPath: 'demo-data', relPath: 'Dokumenty\\Fotky' },
  targetId: null,
  volumeName: 'Data',
  relPath: 'Dokumenty\\Fotky',
  path: 'D:\\Dokumenty\\Fotky',
};

describe('jobForm', () => {
  it('pre-fills name and target folder from the picked source', () => {
    const form = withSource(emptyForm(), folder);
    expect(form.name).toBe('Fotky');
    expect(form.targetRelPath).toBe('Záloha\\Fotky');
  });

  it('keeps a name the user already typed', () => {
    const form = withSource({ ...emptyForm(), name: 'Rodina', nameTouched: true }, folder);
    expect(form.name).toBe('Rodina');
  });

  it('builds input only when required fields are filled', () => {
    const picked = withSource(emptyForm(), folder);
    expect(toInput(picked)).toBeNull();

    const ready = { ...picked, targetVolumeId: 'a1a1a1a1-0000-4000-8000-000000000001' };
    expect(toInput(ready)).toEqual({
      name: 'Fotky',
      source: folder.source,
      target: { volumeId: ready.targetVolumeId, relPath: 'Záloha\\Fotky' },
      mode: 'mirror',
      excludes: [],
    });
    expect(toInput({ ...ready, targetRelPath: ' \\ ' })).toBeNull();
  });
});
