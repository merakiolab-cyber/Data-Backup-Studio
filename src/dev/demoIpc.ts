import { mockIPC } from '@tauri-apps/api/mocks';
import type { AppInfo, LiveVolume, VolumesOverview } from '@/lib/bindings';

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

export function installDemoIpc() {
  mockIPC((command) => {
    switch (command) {
      case 'app_info':
        return appInfo;
      case 'list_volumes':
        return overview;
      default:
        return null;
    }
  });
}
