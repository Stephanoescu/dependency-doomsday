import { fmt, getMessages } from "@/lib/i18n";

interface Props {
  /** null while package.json is still being read (indeterminate). */
  done: number | null;
  total: number;
  current?: string;
}

export function progressText(done: number | null, total: number): string {
  const t = getMessages();
  if (done === null) return t.progress.reading;
  if (done === 0) return t.progress.connecting;
  return fmt(t.progress.checking, { done, total });
}

export function AnalysisProgress({ done, total, current }: Props) {
  const t = getMessages();
  const text = progressText(done, total);
  const determinate = done !== null && total > 0;
  const percent = determinate ? Math.round((done / total) * 100) : 0;

  return (
    <div className="animate-rise border border-line bg-ash/70 p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-4 font-mono text-sm">
        <p className="text-bone">{text}</p>
        {determinate && <p className="text-dim tabular-nums">{percent}%</p>}
      </div>
      <div
        role="progressbar"
        aria-label={t.progress.label}
        aria-valuemin={0}
        aria-valuemax={determinate ? total : undefined}
        aria-valuenow={determinate ? done : undefined}
        aria-valuetext={text}
        className="mt-3 h-1.5 overflow-hidden bg-ash-2"
      >
        {determinate ? (
          <div
            className="h-full bg-alarm transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        ) : (
          <div className="animate-scan h-full w-1/3 bg-alarm/80" />
        )}
      </div>
      <p className="mt-2 h-4 truncate font-mono text-xs text-dim">
        {current ? fmt(t.progress.current, { name: current }) : ""}
      </p>
    </div>
  );
}
