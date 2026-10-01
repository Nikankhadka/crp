type QueueTask = { jobId: string; run: () => Promise<void> };

const pending: QueueTask[] = [];
let draining: Promise<void> | null = null;
let current: string | null = null;

async function drain(): Promise<void> {
  if (draining) return;
  draining = (async () => {
    while (pending.length > 0) {
      const task = pending.shift();
      if (!task) break;
      current = task.jobId;
      try {
        await task.run();
      } catch {
        // runGeneration records its own failures in the job meta
      } finally {
        current = null;
      }
    }
  })();
  try {
    await draining;
  } finally {
    draining = null;
  }
}

/** Queue a job and start draining immediately; one job runs at a time. */
export function enqueue(task: QueueTask): void {
  pending.push(task);
  void drain();
}

export function activeJobId(): string | null {
  return current;
}

export function queuedCount(): number {
  return pending.length;
}
