import { ForecastForm } from "@/components/forecast-form";
import { HomePreview } from "@/components/home-preview";
import { RichText } from "@/components/rich-text";
import { getMessages } from "@/lib/i18n";

export default function Home() {
  const t = getMessages();
  return (
    <main className="mx-auto w-full max-w-5xl px-5 sm:px-8">
      <ForecastForm
        hero={
          <section className="max-w-3xl">
            <p className="font-mono text-xs tracking-[0.25em] text-amber uppercase">
              {"// "}
              {t.home.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[2.75rem] text-balance sm:text-7xl">
              {t.home.titleBefore} <span className="text-alarm">{t.home.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-fog sm:text-lg">
              <RichText text={t.home.lede} strongClassName="font-semibold text-bone" />
            </p>
          </section>
        }
      />
      <div className="mt-16 max-w-3xl sm:mt-24">
        <HomePreview />
      </div>
    </main>
  );
}
