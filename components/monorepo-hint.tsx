import { WarningIcon } from "@/components/icons";
import { getMessages } from "@/lib/i18n";
import { monorepoExampleUrl } from "@/lib/input/monorepo";
import type { GitHubRef, MonorepoInfo } from "@/lib/input/types";

const MAX_WORKSPACES_SHOWN = 6;

interface Props {
  monorepo: MonorepoInfo;
  githubRef?: GitHubRef;
  onUseExample: (url: string) => void;
}

export function MonorepoHint({ monorepo, githubRef, onUseExample }: Props) {
  const t = getMessages();
  const url = monorepoExampleUrl(monorepo.workspaces, githubRef);
  const shown = monorepo.workspaces.slice(0, MAX_WORKSPACES_SHOWN);

  return (
    <div className="animate-rise overflow-hidden border border-amber/50 bg-amber/[0.04]">
      <div aria-hidden className="hazard-stripe h-1.5 opacity-80" />
      <div className="space-y-3 p-4 sm:p-5">
        <p className="flex gap-2.5 font-semibold text-amber">
          <WarningIcon className="mt-0.5 size-4 shrink-0" />
          <span>{t.monorepo.message}</span>
        </p>

        {shown.length > 0 && (
          <p className="font-mono text-xs leading-relaxed text-fog">
            {t.monorepo.workspaces}{" "}
            {shown.map((w, i) => (
              <span key={w}>
                <code className="text-bone">{w}</code>
                {i < shown.length - 1 && ", "}
              </span>
            ))}
            {monorepo.workspaces.length > shown.length && ", …"}
          </p>
        )}

        <div>
          <p className="text-sm text-fog">{t.monorepo.example}</p>
          <code className="mt-1.5 block border border-line bg-void px-3 py-2 font-mono text-xs break-all text-bone sm:text-sm">
            {url}…
          </code>
        </div>

        {githubRef && (
          <button
            type="button"
            onClick={() => onUseExample(url)}
            className="font-mono text-xs font-semibold tracking-wider text-amber uppercase underline decoration-amber/40 underline-offset-4 hover:decoration-amber"
          >
            {t.monorepo.useExample}
          </button>
        )}
      </div>
    </div>
  );
}
