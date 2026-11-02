import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ErrorIcon } from "@/components/icons";
import { SharedForecast, SharedForecastFallback } from "@/components/shared-forecast";
import { fmt, getMessages } from "@/lib/i18n";
import { cachedForecast } from "@/lib/server/forecast";
import { decodeList, ogImagePath, sharePath, type ShareSource } from "@/lib/share/links";

type Props = PageProps<"/list">;

async function sourceOf({ searchParams }: Props): Promise<ShareSource | null> {
  const { d } = await searchParams;
  const list = decodeList(typeof d === "string" ? d : undefined);
  return list ? { kind: "list", list } : null;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const source = await sourceOf(props);
  const t = getMessages().shared;
  if (!source || source.kind !== "list") return { title: t.metaTitleList, robots: { index: false } };
  const label = source.list.projectName;
  const title = label ? fmt(t.metaTitle, { label }) : t.metaTitleList;
  const description = label ? fmt(t.metaDescription, { label }) : t.metaDescriptionList;
  const image = { url: ogImagePath(source), width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    // Lists are personal; keep them out of search results.
    robots: { index: false },
    openGraph: { title, description, url: sharePath(source), images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

async function Forecast(props: Props) {
  const source = await sourceOf(props);
  if (!source) {
    const t = getMessages();
    return (
      <div className="mx-auto max-w-3xl space-y-6 pt-12 sm:pt-20">
        <div role="alert" className="flex gap-3 border border-alarm/60 bg-alarm/10 p-4 text-sm leading-relaxed text-bone">
          <ErrorIcon className="mt-0.5 size-4 shrink-0 text-alarm" />
          <p>{t.shared.invalid}</p>
        </div>
        <Link href="/" className="inline-block font-mono text-xs tracking-[0.15em] text-fog uppercase hover:text-bone">
          ← {t.shared.home}
        </Link>
      </div>
    );
  }
  return <SharedForecast source={source} path={sharePath(source)} initial={await cachedForecast(source)} />;
}

/** /list?d=<lz> — a pasted package.json's forecast. The link holds package names only. */
export default function ListForecastPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <Suspense fallback={<SharedForecastFallback />}>
        <Forecast {...props} />
      </Suspense>
    </main>
  );
}
