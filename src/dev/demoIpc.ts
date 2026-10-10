import { mockIPC } from '@tauri-apps/api/mocks';
import type {
  AppInfo,
  EndpointView,
  Job,
  JobInput,
  JobView,
  LiveVolume,
  LocatedFolder,
  Location,
  SourceRef,
  VolumesOverview,
} from '@/lib/bindings';

/**
 * Fictional data for previewing the UI in a plain browser (`pnpm dev`) and for public screenshots.
 * Loaded only in development when the app is not running inside Tauri.
 */
const TB = 1024 ** 4;
const GB = 1024 ** 3;

function volume(overrides: Partial<LiveVolume>): LiveVolume {
  return {
    guidPath: '\\\\?\\Volume{00000000-0000-0000-0000-000000000000}\\',
    mountPoint: 'X:\\',
    label: 'Disk',
    serial: 0x1234abcd,
    fileSystem: 'NTFS',
    driveKind: 'fixed',
    bus: 'usb',
    model: 'WD Elements 25A2',
    totalBytes: 1.8 * TB,
    freeBytes: 0.9 * TB,
    isSystem: false,
    isExternal: true,
    marker: null,
    ...overrides,
  };
}

const overview: VolumesOverview = {
  registered: [
    {
      volume: {
        id: 'a1a1a1a1-0000-4000-8000-000000000001',
        name: 'Fotky 2 TB',
        serial: 0x1111aaaa,
        guidPath: 'demo-1',
        fileSystem: 'NTFS',
        model: 'WD Elements 25A2',
        totalBytes: 1.8 * TB,
        registeredAtMs: 1_760_000_000_000,
      },
      status: { state: 'connected' },
      live: volume({ guidPath: 'demo-1', mountPoint: 'G:\\', label: 'Fotky', freeBytes: 1.2 * TB }),
    },
    {
      volume: {
        id: 'a1a1a1a1-0000-4000-8000-000000000002',
        name: 'Archiv Seagate',
        serial: 0x2222bbbb,
        guidPath: 'demo-2',
        fileSystem: 'exFAT',
        model: 'Seagate Expansion',
        totalBytes: 3.6 * TB,
        registeredAtMs: 1_760_000_000_000,
      },
      status: { state: 'needsConfirmation', reason: 'markerMissing' },
      live: volume({
        guidPath: 'demo-2',
        mountPoint: 'H:\\',
        label: 'Archiv',
        model: 'Seagate Expansion',
        fileSystem: 'exFAT',
        totalBytes: 3.6 * TB,
        freeBytes: 0.4 * TB,
      }),
    },
    {
      volume: {
        id: 'a1a1a1a1-0000-4000-8000-000000000003',
        name: 'Kancelář 1 TB',
        serial: 0x3333cccc,
        guidPath: 'demo-3',
        fileSystem: 'NTFS',
        model: 'Toshiba Canvio',
        totalBytes: 931 * GB,
        registeredAtMs: 1_760_000_000_000,
      },
      status: { state: 'disconnected' },
      live: null,
    },
  ],
  available: [
    volume({
      guidPath: 'demo-4',
      mountPoint: 'F:\\',
      label: 'USB klíčenka',
      model: 'SanDisk Ultra',
      totalBytes: 57 * GB,
      freeBytes: 41 * GB,
      driveKind: 'removable',
    }),
    volume({
      guidPath: 'demo-5',
      mountPoint: 'C:\\',
      label: 'Systém',
      bus: 'nvme',
      model: 'NVMe SSD 1 TB',
      isSystem: true,
      isExternal: false,
      totalBytes: 931 * GB,
      freeBytes: 310 * GB,
    }),
    volume({
      guidPath: 'demo-6',
      mountPoint: 'D:\\',
      label: 'Data',
      bus: 'sata',
      model: 'SATA HDD 2 TB',
      isExternal: false,
      freeBytes: 0.6 * TB,
    }),
  ],
};

const appInfo: AppInfo = { version: '0.1.0-demo', coreVersion: '0.1.0' };

/** Source volumes remembered by demo jobs (internal disks, nothing written to them). */
const sources: Record<string, { name: string; mountPoint: string }> = {
  'b2b2b2b2-0000-4000-8000-000000000001': { name: 'Data', mountPoint: 'D:\\' },
  'b2b2b2b2-0000-4000-8000-000000000002': { name: 'Systém', mountPoint: 'C:\\' },
};

function endpoint(location: Location): EndpointView {
  const source = sources[location.volumeId];
  if (source) {
    return {
      volumeName: source.name,
      status: { state: 'connected' },
      path: source.mountPoint + location.relPath,
    };
  }
  const target = overview.registered.find((r) => r.volume.id === location.volumeId);
  const connected = target?.status.state === 'connected' && target.live;
  return {
    volumeName: target?.volume.name ?? '',
    status: target?.status ?? { state: 'disconnected' },
    path: connected && target.live ? target.live.mountPoint + location.relPath : null,
  };
}

function demoJob(id: string, input: JobInput, source: Location): JobView {
  const job: Job = {
    id,
    name: input.name,
    source,
    target: input.target,
    mode: input.mode,
    excludes: input.excludes,
    createdAtMs: 1_760_000_000_000,
    updatedAtMs: 1_760_000_000_000,
  };
  return { job, source: endpoint(source), target: endpoint(input.target) };
}

function sourceLocation(ref: SourceRef): Location {
  return ref.kind === 'known'
    ? ref.location
    : { volumeId: 'b2b2b2b2-0000-4000-8000-000000000001', relPath: ref.relPath };
}

function seedJob(id: string, input: Omit<JobInput, 'source'> & { source: Location }): JobView {
  return demoJob(id, { ...input, source: { kind: 'known', location: input.source } }, input.source);
}

let jobs: JobView[] = [
  seedJob('c3c3c3c3-0000-4000-8000-000000000001', {
    name: 'Fotky',
    source: { volumeId: 'b2b2b2b2-0000-4000-8000-000000000001', relPath: 'Fotky' },
    target: { volumeId: 'a1a1a1a1-0000-4000-8000-000000000001', relPath: 'Záloha\\Fotky' },
    mode: 'update',
    excludes: ['*.tmp'],
  }),
  seedJob('c3c3c3c3-0000-4000-8000-000000000002', {
    name: 'Dokumenty',
    source: {
      volumeId: 'b2b2b2b2-0000-4000-8000-000000000002',
      relPath: 'Users\\Demo\\Dokumenty',
    },
    target: { volumeId: 'a1a1a1a1-0000-4000-8000-000000000003', relPath: 'Záloha\\Dokumenty' },
    mode: 'mirror',
    excludes: ['~$*', 'desktop.ini'],
  }),
];

function locate(path: string): LocatedFolder {
  const target = overview.registered.find(
    (r) => r.live && path.toUpperCase().startsWith(r.live.mountPoint),
  );
  const relPath = path.slice(3);
  if (target) {
    return {
      source: { kind: 'known', location: { volumeId: target.volume.id, relPath } },
      targetId: target.volume.id,
      volumeName: target.volume.name,
      relPath,
      path,
    };
  }
  return {
    source: { kind: 'new', guidPath: 'demo-6', relPath },
    targetId: null,
    volumeName: 'Data',
    relPath,
    path,
  };
}

export function installDemoIpc() {
  mockIPC((command, payload) => {
    const args = (payload ?? {}) as Record<string, unknown>;
    switch (command) {
      case 'app_info':
        return appInfo;
      case 'list_volumes':
        return overview;
      case 'list_jobs':
        return jobs;
      case 'plugin:dialog|open':
        return 'D:\\Dokumenty\\Rodina';
      case 'locate_folder':
        return locate(String(args.path));
      case 'create_job': {
        const input = args.input as JobInput;
        const view = demoJob(crypto.randomUUID(), input, sourceLocation(input.source));
        jobs = [...jobs, view];
        return view.job;
      }
      case 'update_job': {
        const input = args.input as JobInput;
        const view = demoJob(String(args.id), input, sourceLocation(input.source));
        jobs = jobs.map((j) => (j.job.id === args.id ? view : j));
        return view.job;
      }
      case 'delete_job':
        jobs = jobs.filter((j) => j.job.id !== args.id);
        return null;
      default:
        return null;
    }
  });
}
