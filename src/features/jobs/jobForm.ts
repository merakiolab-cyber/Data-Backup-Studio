import type {
  BackupMode,
  JobInput,
  JobView,
  LocatedFolder,
  SourceRef,
  VolumeId,
} from '@/lib/bindings';
import { leafName } from './labels';

export interface SourceChoice {
  ref: SourceRef;
  volumeName: string;
  relPath: string;
  /** Current absolute path for display; `null` when the volume is not connected. */
  path: string | null;
}

export interface JobForm {
  name: string;
  /** Once the user edits the name, picking a source no longer overwrites it. */
  nameTouched: boolean;
  source: SourceChoice | null;
  targetVolumeId: VolumeId | null;
  targetRelPath: string;
  mode: BackupMode;
  excludes: string[];
}

export const MAX_NAME_LENGTH = 64;

export function emptyForm(): JobForm {
  return {
    name: '',
    nameTouched: false,
    source: null,
    targetVolumeId: null,
    targetRelPath: '',
    mode: 'update',
    excludes: [],
  };
}

export function formFromJob({ job, source }: JobView): JobForm {
  return {
    name: job.name,
    nameTouched: true,
    source: {
      ref: { kind: 'known', location: job.source },
      volumeName: source.volumeName,
      relPath: job.source.relPath,
      path: source.path,
    },
    targetVolumeId: job.target.volumeId,
    targetRelPath: job.target.relPath,
    mode: job.mode,
    excludes: job.excludes,
  };
}

/** Applies a picked source folder and pre-fills the name and target folder when still empty. */
export function withSource(form: JobForm, folder: LocatedFolder): JobForm {
  const leaf = leafName(folder.relPath) || folder.volumeName;
  return {
    ...form,
    source: {
      ref: folder.source,
      volumeName: folder.volumeName,
      relPath: folder.relPath,
      path: folder.path,
    },
    name: form.nameTouched ? form.name : leaf.slice(0, MAX_NAME_LENGTH),
    targetRelPath: form.targetRelPath.trim() ? form.targetRelPath : `Záloha\\${leaf}`,
  };
}

/** Request for the backend, or `null` while required fields are missing. */
export function toInput(form: JobForm): JobInput | null {
  const name = form.name.trim();
  const targetRelPath = form.targetRelPath.trim();
  if (!name || name.length > MAX_NAME_LENGTH || !form.source || !form.targetVolumeId) {
    return null;
  }
  if (!targetRelPath.replace(/[\\/]/g, '')) {
    return null;
  }
  return {
    name,
    source: form.source.ref,
    target: { volumeId: form.targetVolumeId, relPath: targetRelPath },
    mode: form.mode,
    excludes: form.excludes,
  };
}
