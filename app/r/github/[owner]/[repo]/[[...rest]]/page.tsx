import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SharedForecast, SharedForecastFallback } from "@/components/shared-forecast";
import { fmt, getMessages } from "@/lib/i18n";
import { ogImagePath, repoSourceFromRoute, sharePath, sourceLabel } from "@/lib/share/links";

type Props = PageProps<"/r/github/[owner]/[repo]/[[...rest]]">;

async function sourceOf({ params, searchParams }: Props) {
  const [{ owner, repo, rest }, { dev }] = await Promise.all([params, searchParams]);
  return repoSourceFromRoute(owner, repo, rest, dev);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const source = await sourceOf(props);
  if (!source) return {};
  const t = getMessages().shared;
  const label = sourceLabel(source) ?? "";
  const title = fmt(t.metaTitle, { label });
  const description = fmt(t.metaDescription, { label });
  const image = { url: ogImagePath(source), width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    alternates: { canonical: sharePath(source) },
    openGraph: { title, description, url: sharePath(source), images: [image], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

async function Forecast(props: Props) {
  const source = await sourceOf(props);
  if (!source) notFound();
  return <SharedForecast source={source} path={sharePath(source)} />;
}

/** /r/github/owner/repo[/tree/<ref>/<path>] — a repo's forecast, recomputed from cache. */
export default function RepoForecastPage(props: Props) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <Suspense fallback={<SharedForecastFallback />}>
        <Forecast {...props} />
      </Suspense>
    </main>
  );
}
