import { mockIPC } from '@tauri-apps/api/mocks';
import type {
  AppInfo,
  AppSettings,
  EndpointView,
  Job,
  JobGroup,
  JobInput,
  JobsOverview,
  JobView,
  LiveVolume,
  LocatedFolder,
  Location,
  PlanView,
  RunDetail,
  RunResult,
  RunSummary,
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

let overview: VolumesOverview = {
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

let settings: AppSettings = {
  copyParallelism: 4,
  mtimeToleranceSecs: 2,
  deleteThresholdPercent: 20,
  verifyCopies: false,
  locale: 'cs',
};

const appInfo: AppInfo = {
  version: '0.1.0-demo',
  coreVersion: '0.1.0',
  dataDir: 'C:\\Users\\Demo\\AppData\\Roaming\\app.databackupstudio',
};

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

function demoJob(
  id: string,
  input: JobInput,
  source: Location,
  groupId: string | null = null,
): JobView {
  const job: Job = {
    id,
    name: input.name,
    source,
    target: input.target,
    mode: input.mode,
    excludes: input.excludes,
    groupId,
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

const fotkyId = 'c3c3c3c3-0000-4000-8000-000000000001';
const dokumentyId = 'c3c3c3c3-0000-4000-8000-000000000002';
const fotkyGroupId = 'e5e5e5e5-0000-4000-8000-000000000001';

let groups: JobGroup[] = [{ id: fotkyGroupId, name: 'Fotky 2 TB', sortOrder: 0 }];

let jobs: JobView[] = [
  seedJob(fotkyId, {
    name: 'Fotky',
    source: { volumeId: 'b2b2b2b2-0000-4000-8000-000000000001', relPath: 'Fotky' },
    target: { volumeId: 'a1a1a1a1-0000-4000-8000-000000000001', relPath: 'Záloha\\Fotky' },
    mode: 'update',
    excludes: ['*.tmp'],
  }),
  seedJob(dokumentyId, {
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
jobs = jobs.map((view) =>
  view.job.id === fotkyId ? { ...view, job: { ...view.job, groupId: fotkyGroupId } } : view,
);

function demoRun(partial: Omit<RunSummary, 'id'> & { id?: string }): RunSummary {
  return {
    id: partial.id ?? crypto.randomUUID(),
    ...partial,
  };
}

const day = 86_400_000;
const now = Date.now();
let runs: RunSummary[] = [
  demoRun({
    id: 'd4d4d4d4-0000-4000-8000-000000000001',
    jobId: fotkyId,
    jobName: 'Fotky',
    mode: 'update',
    status: 'done',
    startedAtMs: now - 3_600_000,
    finishedAtMs: now - 3_540_000,
    copied: 3,
    updated: 1,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied: 12_000_000,
    errorCount: 0,
  }),
  demoRun({
    id: 'd4d4d4d4-0000-4000-8000-000000000002',
    jobId: dokumentyId,
    jobName: 'Dokumenty',
    mode: 'mirror',
    status: 'failed',
    startedAtMs: now - day,
    finishedAtMs: now - day + 8_000,
    copied: 0,
    updated: 0,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied: 0,
    errorCount: 1,
  }),
  demoRun({
    id: 'd4d4d4d4-0000-4000-8000-000000000003',
    jobId: fotkyId,
    jobName: 'Fotky',
    mode: 'update',
    status: 'cancelled',
    startedAtMs: now - 3 * day,
    finishedAtMs: now - 3 * day + 20_000,
    copied: 1,
    updated: 0,
    deleted: 0,
    dirsCreated: 0,
    bytesCopied: 2_000_000,
    errorCount: 0,
  }),
];

const runErrors: Record<string, string[]> = {
  'd4d4d4d4-0000-4000-8000-000000000002': ['Cílový disk není připojený.'],
};

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
      case 'open_location':
      case 'open_data_dir':
        return null;
      case 'get_settings':
        return settings;
      case 'update_settings':
        settings = args.settings as AppSettings;
        return settings;
      case 'export_config':
        return null;
      case 'import_config':
        return settings;
      case 'list_volumes':
        return overview;
      case 'reorder_volumes': {
        const orderedIds = args.orderedIds as string[];
        const byId = new Map(overview.registered.map((view) => [view.volume.id, view]));
        overview = {
          ...overview,
          registered: orderedIds
            .map((id) => byId.get(id))
            .filter((view): view is (typeof overview.registered)[number] => view !== undefined),
        };
        return null;
      }
      case 'list_jobs': {
        const payload: JobsOverview = { groups, jobs };
        return payload;
      }
      case 'create_job_group': {
        const name = String(args.name).trim();
        const jobIds = args.jobIds as string[];
        const group: JobGroup = {
          id: crypto.randomUUID(),
          name,
          sortOrder: groups.reduce((max, g) => Math.max(max, g.sortOrder), 0) + 1,
        };
        groups = [...groups, group];
        jobs = jobs.map((view) =>
          jobIds.includes(view.job.id)
            ? { ...view, job: { ...view.job, groupId: group.id } }
            : view,
        );
        return group;
      }
      case 'rename_job_group': {
        const id = String(args.id);
        const name = String(args.name).trim();
        groups = groups.map((g) => (g.id === id ? { ...g, name } : g));
        return groups.find((g) => g.id === id) ?? null;
      }
      case 'delete_job_group': {
        const id = String(args.id);
        groups = groups.filter((g) => g.id !== id);
        jobs = jobs.map((view) =>
          view.job.groupId === id ? { ...view, job: { ...view.job, groupId: null } } : view,
        );
        return null;
      }
      case 'set_jobs_group': {
        const jobIds = args.jobIds as string[];
        const groupId = (args.groupId as string | null) ?? null;
        jobs = jobs.map((view) =>
          jobIds.includes(view.job.id) ? { ...view, job: { ...view.job, groupId } } : view,
        );
        return null;
      }
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
      case 'preview_job': {
        const view = jobs.find((j) => j.job.id === args.id);
        if (!view) {
          throw { kind: 'NotFound', message: 'Úloha už neexistuje.' };
        }
        const plan: PlanView = {
          jobId: view.job.id,
          jobName: view.job.name,
          mode: view.job.mode,
          summary: {
            createDirs: 0,
            copy: 3,
            update: 1,
            delete: view.job.mode === 'mirror' ? 1 : 0,
            bytesToCopy: 12_000_000,
            bytesToDelete: view.job.mode === 'mirror' ? 400_000 : 0,
            targetFiles: 40,
            sourceFiles: 42,
          },
          requiresDeleteConfirmation: false,
          deleteThresholdPercent: 20,
          actions: [
            { kind: 'copy', relPath: 'Album\\nova.jpg', bytes: 2_000_000 },
            { kind: 'update', relPath: 'index.txt', bytes: 1200 },
            { kind: 'delete', relPath: 'stare.tmp', bytes: 400_000 },
          ],
          actionsTruncated: false,
        };
        return plan;
      }
      case 'run_job': {
        const view = jobs.find((j) => j.job.id === args.id);
        const outcome: RunResult = {
          phase: 'done',
          copied: 3,
          updated: 1,
          deleted: view?.job.mode === 'mirror' ? 1 : 0,
          dirsCreated: 0,
          bytesCopied: 12_000_000,
          errors: [],
        };
        if (view) {
          const startedAtMs = Date.now();
          runs = [
            demoRun({
              jobId: view.job.id,
              jobName: view.job.name,
              mode: view.job.mode,
              status: 'done',
              startedAtMs,
              finishedAtMs: startedAtMs + 4_000,
              copied: outcome.copied,
              updated: outcome.updated,
              deleted: outcome.deleted,
              dirsCreated: outcome.dirsCreated,
              bytesCopied: outcome.bytesCopied,
              errorCount: 0,
            }),
            ...runs,
          ];
        }
        return outcome;
      }
      case 'cancel_run':
        return null;
      case 'list_runs': {
        const jobId = args.jobId as string | null;
        return jobId ? runs.filter((run) => run.jobId === jobId) : runs;
      }
      case 'get_run': {
        const run = runs.find((item) => item.id === args.id);
        if (!run) {
          throw { kind: 'NotFound', message: 'Záznam běhu v historii nebyl nalezen.' };
        }
        const detail: RunDetail = { run, errors: runErrors[run.id] ?? [] };
        return detail;
      }
      case 'open_run_log':
        return null;
      case 'get_run_log': {
        const run = runs.find((item) => item.id === args.id);
        if (!run) {
          return null;
        }
        const errors = (runErrors[run.id] ?? []).map((line) => `chyba  ${line}`).join('\n');
        return [
          'Data Backup Studio – záznam běhu',
          `úloha: ${run.jobName}`,
          `režim: ${run.mode === 'mirror' ? 'Zrcadlo' : 'Aktualizace'}`,
          run.copied > 0 ? `kopie  Album\\nova.jpg  ${run.bytesCopied}` : null,
          errors || null,
          `stav: ${run.status === 'done' ? 'hotovo' : run.status === 'cancelled' ? 'zrušeno' : 'selhalo'}`,
        ]
          .filter((line): line is string => line !== null)
          .join('\n');
      }
      default:
        return null;
    }
  });
}
