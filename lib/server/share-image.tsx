import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { fmt, getMessages, plural } from "@/lib/i18n";
import type { RiskLevel } from "@/lib/risk";
import { imageHeadline, type ForecastSummary } from "./forecast";

export type ImageFormat = "wide" | "story";

export const IMAGE_SIZE: Record<ImageFormat, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 },
};

// Satori can't read CSS variables: the palette from globals.css, spelled out.
const C = {
  void: "#09090b",
  ash: "#111114",
  line: "#2a2a31",
  lineStrong: "#3a3a44",
  bone: "#eeece6",
  fog: "#a1a1aa",
  dim: "#8b8b94",
  alarm: "#ff453a",
  amber: "#ffb020",
  low: "#34d27b",
  mid: "#ffd60a",
  high: "#ff453a",
};
const LEVEL_COLOR: Record<RiskLevel, string> = { low: C.low, mid: C.mid, high: C.high };

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

let fonts: Promise<Fonts> | null = null;

function loadFonts(): Promise<Fonts> {
  fonts ??= (async () => {
    const dir = join(process.cwd(), "assets/fonts");
    const [display, mono, monoBold] = await Promise.all([
      readFile(join(dir, "ArchivoBlack-Regular.ttf")),
      readFile(join(dir, "JetBrainsMono-Regular.ttf")),
      readFile(join(dir, "JetBrainsMono-Bold.ttf")),
    ]);
    return [
      { name: "Display", data: display, weight: 900 as const, style: "normal" as const },
      { name: "Mono", data: mono, weight: 400 as const, style: "normal" as const },
      { name: "Mono", data: monoBold, weight: 700 as const, style: "normal" as const },
    ];
  })();
  return fonts;
}

/** Package names can't wrap; very long ones are shortened so they never overflow the card. */
function shortenLongWords(text: string, max = 34): string {
  return text.replace(/\S+/g, (word) => (word.length > max ? `${word.slice(0, max - 11)}…${word.slice(-10)}` : word));
}

/**
 * **emphasis** → words made of colored pieces. Satori wraps flex items, not
 * text runs, so every word is its own item and lines only break between words.
 */
export function emphasisWords(text: string): { text: string; strong: boolean }[][] {
  const words: { text: string; strong: boolean }[][] = [[]];
  shortenLongWords(text)
    .split(/\*\*(.+?)\*\*/g)
    .forEach((segment, i) => {
      segment.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) words.push([]);
        else words.at(-1)!.push({ text: part, strong: i % 2 === 1 });
      });
    });
  return words.filter((w) => w.length > 0);
}

function Headline({ text, color, fontSize, center }: { text: string; color: string; fontSize: number; center?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: center ? "center" : "flex-start",
        fontFamily: "Display",
        fontSize,
        lineHeight: 1.12,
        color: C.bone,
      }}
    >
      {emphasisWords(text).map((word, i) => (
        <div key={i} style={{ display: "flex", marginRight: fontSize * 0.28 }}>
          {word.map((piece, j) => (
            <span key={j} style={piece.strong ? { color } : undefined}>
              {piece.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function polar(angle: number, r: number, c = 100) {
  const a = ((angle - 90) * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
}

function Clock({ minutes, level, size }: { minutes: number | null; level: RiskLevel | null; size: number }) {
  const shown = minutes ?? 30;
  const minuteAngle = 360 - shown * 6;
  const hourAngle = 360 - shown * 0.5;
  const color = level ? LEVEL_COLOR[level] : C.fog;
  const hand = (angle: number, length: number, width: number, stroke: string) => {
    const tip = polar(angle, length);
    const tail = polar(angle + 180, 12);
    return <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} stroke={stroke} strokeWidth={width} strokeLinecap="round" />;
  };
  const start = polar(minuteAngle, 86);
  const end = polar(360, 86);
  const sweep = 360 - minuteAngle;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <circle cx={100} cy={100} r={97} fill="none" stroke={C.line} strokeWidth={1} />
      <circle cx={100} cy={100} r={92} fill="#141418" stroke={C.lineStrong} strokeWidth={2} />
      {minutes !== null && sweep > 0.01 && (
        <path
          d={`M 100 100 L ${start.x} ${start.y} A 86 86 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`}
          fill={color}
          fillOpacity={0.25}
        />
      )}
      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        const a = polar(i * 6, 88);
        const b = polar(i * 6, i === 0 ? 70 : major ? 78 : 84);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={i === 0 ? C.alarm : major ? C.bone : C.lineStrong}
            strokeWidth={i === 0 ? 5 : major ? 3 : 1.5}
            strokeLinecap="round"
          />
        );
      })}
      {hand(hourAngle, 46, 7, C.bone)}
      {hand(minuteAngle, 74, 4, color)}
      <circle cx={100} cy={100} r={7} fill={C.bone} />
      <circle cx={100} cy={100} r={3} fill={C.void} />
    </svg>
  );
}

function Brand({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.6 }}>
      <div style={{ width: size * 0.6, height: size * 0.6, borderRadius: 999, background: C.alarm }} />
      <div style={{ fontFamily: "Mono", fontWeight: 700, fontSize: size, letterSpacing: size * 0.2, color: C.bone }}>
        DEPENDENCY DOOMSDAY
      </div>
    </div>
  );
}

function Frame({ children, format }: { children: ReactNode; format: ImageFormat }) {
  const { width, height } = IMAGE_SIZE[format];
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        background: C.void,
        backgroundImage: `radial-gradient(120% 60% at 50% -10%, rgba(255,69,58,0.22), transparent 60%)`,
        color: C.bone,
        fontFamily: "Mono",
        padding: format === "wide" ? 56 : 80,
      }}
    >
      {children}
    </div>
  );
}

function Footer({ url, size }: { url: string; size: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: size, color: C.dim }}>
      <div style={{ display: "flex" }}>{url}</div>
      <div style={{ display: "flex", color: C.fog }}>{getMessages().og.footer}</div>
    </div>
  );
}

function scoreBlock(summary: ForecastSummary, scale: number) {
  const t = getMessages();
  const scored = summary.state !== "insufficient" && summary.score !== null && summary.minutesToMidnight !== null;
  const color = scored && summary.level ? LEVEL_COLOR[summary.level] : C.fog;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22 * scale, letterSpacing: 5 * scale, color: C.dim }}>{t.og.scoreLabel}</div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        <div style={{ fontFamily: "Display", fontSize: 190 * scale, lineHeight: 1, color }}>
          {scored ? String(summary.score) : "?"}
        </div>
        <div style={{ fontSize: 44 * scale, color: C.dim, marginBottom: 18 * scale, marginLeft: 8 * scale }}>/100</div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 28 * scale, letterSpacing: 2 * scale, color: C.amber }}>
        {scored ? plural(t.forecast.minutes, summary.minutesToMidnight!).toUpperCase() : t.forecast.noScore}
      </div>
    </div>
  );
}

function WideCard({ summary, url }: { summary: ForecastSummary; url: string }) {
  const accent = summary.state === "all-clear" ? C.low : C.alarm;
  return (
    <Frame format="wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand />
        {summary.label && <div style={{ display: "flex", fontSize: 22, color: C.fog }}>{shortenLongWords(summary.label, 44)}</div>}
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 52 }}>
        <Clock minutes={summary.state === "insufficient" ? null : summary.minutesToMidnight} level={summary.level} size={330} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
          {scoreBlock(summary, 0.9)}
          <Headline text={imageHeadline(summary)} color={accent} fontSize={32} />
        </div>
      </div>
      <Footer url={url} size={20} />
    </Frame>
  );
}

function StoryCard({ summary, url }: { summary: ForecastSummary; url: string }) {
  const t = getMessages();
  const accent = summary.state === "all-clear" ? C.low : C.alarm;
  const stats =
    summary.state === "insufficient"
      ? null
      : fmt(t.og.stats, {
          total: summary.scored,
          high: summary.levels.high,
          critical: summary.critical,
        });
  return (
    <Frame format="story">
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Brand size={30} />
      </div>
      {summary.label && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 28, fontSize: 30, color: C.fog }}>
          {shortenLongWords(summary.label, 40)}
        </div>
      )}
      <div style={{ display: "flex", marginTop: 56 }}>
        <Headline text={imageHeadline(summary)} color={accent} fontSize={60} center />
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28 }}>
        <Clock minutes={summary.state === "insufficient" ? null : summary.minutesToMidnight} level={summary.level} size={500} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>{scoreBlock(summary, 1.25)}</div>
        {stats && <div style={{ display: "flex", fontSize: 30, color: C.fog }}>{stats}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 40 }}>
        <div style={{ display: "flex", fontFamily: "Display", fontSize: 44, color: C.bone }}>{t.og.cta}</div>
        <div style={{ display: "flex", fontSize: 30, color: C.dim }}>{url}</div>
      </div>
    </Frame>
  );
}

/** The brand card: no score. Used for the home page and while a forecast is still computing. */
function GenericCard({ format, url, label }: { format: ImageFormat; url: string; label?: string }) {
  const t = getMessages();
  const wide = format === "wide";
  return (
    <Frame format={format}>
      <div style={{ display: "flex", justifyContent: wide ? "flex-start" : "center" }}>
        <Brand size={wide ? 22 : 30} />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: wide ? "row" : "column",
          alignItems: "center",
          justifyContent: "center",
          gap: wide ? 60 : 80,
        }}
      >
        <Clock minutes={2} level="high" size={wide ? 330 : 620} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: wide ? "flex-start" : "center", gap: 24, maxWidth: wide ? 640 : 900 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: wide ? "flex-start" : "center",
              textAlign: wide ? "left" : "center",
              fontFamily: "Display",
              fontSize: wide ? 64 : 92,
              lineHeight: 1.02,
            }}
          >
            <span>{t.og.genericTitle}&nbsp;</span>
            <span style={{ color: C.alarm }}>{t.og.genericAccent}</span>
          </div>
          <div style={{ display: "flex", fontSize: wide ? 26 : 34, color: C.fog, textAlign: wide ? "left" : "center" }}>
            {label ? fmt(t.og.pending, { label: shortenLongWords(label, 40) }) : t.og.genericBody}
          </div>
        </div>
      </div>
      <Footer url={url} size={wide ? 20 : 28} />
    </Frame>
  );
}

/** The home page's own card: the promise in one look. */
function HomeCard({ url }: { url: string }) {
  const t = getMessages();
  return (
    <Frame format="wide">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand />
        <div style={{ display: "flex", fontSize: 20, color: C.fog }}>{t.og.homeBadge}</div>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56 }}>
        <Clock minutes={3} level="high" size={330} />
        <div style={{ display: "flex", flexDirection: "column", gap: 26, flex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "Display", fontSize: 64, lineHeight: 1.02 }}>
            <span>{t.og.genericTitle}&nbsp;</span>
            <span style={{ color: C.alarm }}>{t.og.genericAccent}</span>
          </div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.35, color: C.fog }}>{t.og.homeBody}</div>
          <div style={{ display: "flex", gap: 12 }}>
            {t.og.homeChips.map((chip, i) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "6px 14px",
                  border: `2px solid ${[C.alarm, C.amber, C.mid][i] ?? C.lineStrong}`,
                  color: [C.alarm, C.amber, C.mid][i] ?? C.fog,
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                {chip.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer url={url} size={20} />
    </Frame>
  );
}

export async function renderHomeImage(url: string): Promise<ImageResponse> {
  return new ImageResponse(<HomeCard url={url} />, { ...IMAGE_SIZE.wide, fonts: await loadFonts() });
}

export async function renderShareImage(
  { summary, format, url, label }: { summary: ForecastSummary | null; format: ImageFormat; url: string; label?: string },
  headers: Record<string, string>,
): Promise<ImageResponse> {
  const card = !summary ? (
    <GenericCard format={format} url={url} label={label} />
  ) : format === "story" ? (
    <StoryCard summary={summary} url={url} />
  ) : (
    <WideCard summary={summary} url={url} />
  );
  return new ImageResponse(card, { ...IMAGE_SIZE[format], fonts: await loadFonts(), headers });
}
