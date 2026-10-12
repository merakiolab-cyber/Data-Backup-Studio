import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { runsKey } from '@/features/history/api';
import {
  commands,
  events,
  type JobId,
  type PlanView,
  type RunProgress,
  type RunResult,
} from '@/lib/bindings';
import { unwrap } from '@/lib/result';

export interface RunQueueItem {
  id: JobId;
  name: string;
}

export type RunStage = 'idle' | 'loading' | 'plan' | 'running' | 'done' | 'error';

export type EnqueueResult = 'started' | 'queued' | 'ignored';

interface RunSessionValue {
  queue: RunQueueItem[];
  skipped: number;
  index: number;
  stage: RunStage;
  plan: PlanView | null;
  confirmDelete: boolean;
  result: RunResult | null;
  error: string | null;
  progress: RunProgress | null;
  expanded: boolean;
  /** True while a session owns the UI (not idle). */
  active: boolean;
  enqueue: (items: RunQueueItem[], skipped?: number) => EnqueueResult;
  setConfirmDelete: (value: boolean) => void;
  setExpanded: (value: boolean) => void;
  startBackup: () => void;
  cancelBackup: () => void;
  skipCurrent: () => void;
  goNext: () => void;
  dismiss: () => void;
}

const RunSessionContext = createContext<RunSessionValue | null>(null);

export function useRunSession(): RunSessionValue {
  const value = useContext(RunSessionContext);
  if (!value) {
    throw new Error('useRunSession must be used inside RunSessionProvider');
  }
  return value;
}

function mergeQueue(existing: RunQueueItem[], incoming: RunQueueItem[]): RunQueueItem[] {
  const seen = new Set(existing.map((item) => item.id));
  const next = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      next.push(item);
    }
  }
  return next;
}

export function RunSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<RunQueueItem[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<RunStage>('idle');
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [expanded, setExpanded] = useState(false);
  const stageRef = useRef(stage);
  const indexRef = useRef(index);
  const queueRef = useRef(queue);
  const planRef = useRef(plan);
  const confirmRef = useRef(confirmDelete);
  /** After the first job in a multi queue starts, following jobs run without manual confirm. */
  const chainRunsRef = useRef(false);
  const runJobAtIndexRef = useRef<
    (jobIndex: number, currentPlan: PlanView, confirmDeleteOverThreshold: boolean) => void
  >(() => {});
  stageRef.current = stage;
  indexRef.current = index;
  queueRef.current = queue;
  planRef.current = plan;
  confirmRef.current = confirmDelete;

  const active = stage !== 'idle';

  const invalidateRuns = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: runsKey }),
    ]);
  }, [queryClient]);

  const beginChainedJob = useCallback(
    (nextIndex: number) => {
      const next = queueRef.current[nextIndex];
      if (!next) {
        return;
      }
      setIndex(nextIndex);
      setExpanded(false);
      setStage('loading');
      setPlan(null);
      setConfirmDelete(false);
      setResult(null);
      setError(null);
      setProgress(null);
      void commands
        .previewJob(next.id)
        .then((raw) => {
          if (stageRef.current === 'idle') {
            return;
          }
          const nextPlan = unwrap(raw);
          setPlan(nextPlan);
          if (nextPlan.requiresDeleteConfirmation) {
            setStage('plan');
            setExpanded(true);
            return;
          }
          runJobAtIndexRef.current(nextIndex, nextPlan, false);
        })
        .catch((err: unknown) => {
          if (stageRef.current === 'idle') {
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
          setStage('error');
          setExpanded(true);
          invalidateRuns();
        });
    },
    [invalidateRuns],
  );

  const continueChainIfAny = useCallback(
    (outcome: 'done' | 'error' | 'cancelled'): boolean => {
      if (outcome === 'cancelled') {
        chainRunsRef.current = false;
        return false;
      }
      const nextIndex = indexRef.current + 1;
      if (!chainRunsRef.current || nextIndex >= queueRef.current.length) {
        return false;
      }
      beginChainedJob(nextIndex);
      return true;
    },
    [beginChainedJob],
  );

  const runJobAtIndex = useCallback(
    (jobIndex: number, _currentPlan: PlanView, confirmDeleteOverThreshold: boolean) => {
      const job = queueRef.current[jobIndex];
      if (!job) {
        return;
      }
      setStage('running');
      setError(null);
      setProgress(null);
      void commands
        .runJob(job.id, confirmDeleteOverThreshold)
        .then((raw) => {
          if (stageRef.current === 'idle') {
            return;
          }
          const outcome = unwrap(raw);
          invalidateRuns();
          if (outcome.phase === 'cancelled') {
            chainRunsRef.current = false;
            setResult(outcome);
            setStage('done');
            return;
          }
          if (continueChainIfAny('done')) {
            return;
          }
          setResult(outcome);
          setStage('done');
        })
        .catch((err: unknown) => {
          if (stageRef.current === 'idle') {
            return;
          }
          invalidateRuns();
          if (continueChainIfAny('error')) {
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
          setStage('error');
        });
    },
    [continueChainIfAny, invalidateRuns],
  );

  runJobAtIndexRef.current = runJobAtIndex;

  const loadPreview = useCallback((jobId: JobId) => {
    setStage('loading');
    setPlan(null);
    setConfirmDelete(false);
    setResult(null);
    setError(null);
    setProgress(null);
    void commands
      .previewJob(jobId)
      .then((raw) => {
        if (stageRef.current === 'idle') {
          return;
        }
        setPlan(unwrap(raw));
        setStage('plan');
      })
      .catch((err: unknown) => {
        if (stageRef.current === 'idle') {
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStage('error');
      });
  }, []);

  useEffect(() => {
    if (stage !== 'running') {
      return;
    }
    let cancelled = false;
    const unlisten = events.runProgressEvent.listen((event) => {
      if (!cancelled) {
        setProgress(event.payload.progress);
      }
    });
    return () => {
      cancelled = true;
      void unlisten.then((stop) => stop());
    };
  }, [stage]);

  const advanceTo = useCallback(
    (nextIndex: number) => {
      const next = queueRef.current[nextIndex];
      if (!next) {
        return;
      }
      setIndex(nextIndex);
      setExpanded(true);
      loadPreview(next.id);
    },
    [loadPreview],
  );

  const enqueue = useCallback(
    (items: RunQueueItem[], skippedCount = 0): EnqueueResult => {
      if (items.length === 0) {
        return 'ignored';
      }
      const currentStage = stageRef.current;
      if (currentStage === 'idle') {
        const first = items[0];
        if (!first) {
          return 'ignored';
        }
        chainRunsRef.current = false;
        setQueue(items);
        setSkipped(skippedCount);
        setIndex(0);
        setExpanded(true);
        loadPreview(first.id);
        return 'started';
      }

      const prev = queueRef.current;
      const merged = mergeQueue(prev, items);
      const added = merged.length - prev.length;
      setQueue(merged);
      if (skippedCount > 0) {
        setSkipped((value) => value + skippedCount);
      }
      if (currentStage !== 'running' && currentStage !== 'loading') {
        setExpanded(true);
      }

      if (
        added > 0 &&
        (currentStage === 'done' || currentStage === 'error') &&
        indexRef.current >= prev.length - 1
      ) {
        advanceTo(prev.length);
      }
      return 'queued';
    },
    [advanceTo, loadPreview],
  );

  const startBackup = useCallback(() => {
    const jobIndex = indexRef.current;
    const job = queueRef.current[jobIndex];
    const currentPlan = planRef.current;
    if (!job || !currentPlan || stageRef.current !== 'plan') {
      return;
    }
    if (currentPlan.requiresDeleteConfirmation && !confirmRef.current) {
      return;
    }
    if (queueRef.current.length > 1) {
      chainRunsRef.current = true;
    }
    const confirm = currentPlan.requiresDeleteConfirmation ? confirmRef.current : false;
    runJobAtIndex(jobIndex, currentPlan, confirm);
  }, [runJobAtIndex]);

  const cancelBackup = useCallback(() => {
    void commands.cancelRun().then((raw) => {
      unwrap(raw);
    });
  }, []);

  const skipCurrent = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex < queueRef.current.length) {
      advanceTo(nextIndex);
    }
  }, [advanceTo]);

  const goNext = useCallback(() => {
    const nextIndex = indexRef.current + 1;
    if (nextIndex < queueRef.current.length) {
      advanceTo(nextIndex);
    }
  }, [advanceTo]);

  const dismiss = useCallback(() => {
    if (stageRef.current === 'running' || stageRef.current === 'loading') {
      setExpanded(false);
      return;
    }
    chainRunsRef.current = false;
    setStage('idle');
    setQueue([]);
    setSkipped(0);
    setIndex(0);
    setPlan(null);
    setConfirmDelete(false);
    setResult(null);
    setError(null);
    setProgress(null);
    setExpanded(false);
  }, []);

  const value = useMemo<RunSessionValue>(
    () => ({
      queue,
      skipped,
      index,
      stage,
      plan,
      confirmDelete,
      result,
      error,
      progress,
      expanded,
      active,
      enqueue,
      setConfirmDelete,
      setExpanded,
      startBackup,
      cancelBackup,
      skipCurrent,
      goNext,
      dismiss,
    }),
    [
      queue,
      skipped,
      index,
      stage,
      plan,
      confirmDelete,
      result,
      error,
      progress,
      expanded,
      active,
      enqueue,
      startBackup,
      cancelBackup,
      skipCurrent,
      goNext,
      dismiss,
    ],
  );

  return <RunSessionContext.Provider value={value}>{children}</RunSessionContext.Provider>;
}
