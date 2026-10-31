import { LockIcon } from "@/components/icons";
import { RichText } from "@/components/rich-text";
import { getMessages } from "@/lib/i18n";

export function PrivacyNotice() {
  const t = getMessages();
  return (
    <aside className="flex gap-3 border-l-2 border-risk-low/70 py-1 pl-4">
      <LockIcon className="mt-0.5 size-4 shrink-0 text-risk-low" />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-bone">{t.privacy.title}</p>
        <p className="mt-1 text-fog">
          <RichText text={t.privacy.body} strongClassName="font-semibold text-bone" />
        </p>
      </div>
    </aside>
  );
}
