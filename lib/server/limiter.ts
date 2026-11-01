/** Most outgoing requests in flight at once, per analysis. */
export const MAX_CONCURRENCY = 8;

export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

/** A tiny semaphore: at most `concurrency` tasks run at once, the rest wait in FIFO order. */
export function createLimiter(concurrency: number): Limiter {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (active >= concurrency) return;
    const start = queue.shift();
    if (!start) return;
    active++;
    start();
  };

  return <T>(task: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      queue.push(() => {
        task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
}
