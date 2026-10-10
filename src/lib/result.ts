import type { AppError } from './bindings';

type CommandResult<T> = { status: 'ok'; data: T } | { status: 'error'; error: AppError };

export class CommandError extends Error {
  constructor(readonly appError: AppError) {
    super(appError.message);
    this.name = 'CommandError';
  }
}

/** Converts a tauri-specta command result into a value or a thrown `CommandError` (for TanStack Query). */
export function unwrap<T>(result: CommandResult<T>): T {
  if (result.status === 'ok') {
    return result.data;
  }
  throw new CommandError(result.error);
}
