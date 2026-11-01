import type { RiskLevel } from "@/lib/risk";
import { LEVEL_STROKE } from "./risk-style";

/** Where the minute hand starts its sweep: half an hour before midnight. */
export const CLOCK_START_MINUTES = 30;

const C = 100;
const R = 92;

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
}

/** Pie slice from `fromDeg` clockwise to 12 o'clock: the time left before midnight. */
function wedge(fromDeg: number, radius: number) {
  const start = polar(fromDeg, radius);
  const end = polar(360, radius);
  const sweep = 360 - fromDeg;
  if (sweep <= 0.01) return "";
  return `M ${C} ${C} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
}

interface Props {
  /** Minutes before midnight shown by the hands (fractional while animating). null = unknown. */
  minutes: number | null;
  level: RiskLevel | null;
  className?: string;
}

/** Decorative: the score and minutes are given as text next to it. */
export function DoomsdayClock({ minutes, level, className }: Props) {
  const shown = minutes ?? CLOCK_START_MINUTES;
  const minuteAngle = 360 - shown * 6;
  const hourAngle = 360 - shown * 0.5;
  const color = level ? LEVEL_STROKE[level] : "var(--color-line-strong)";

  return (
    <svg viewBox="0 0 200 200" aria-hidden className={className}>
      <defs>
        <radialGradient id="dd-face" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1b1b20" />
          <stop offset="100%" stopColor="#0c0c0f" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={R + 5} fill="none" stroke="var(--color-line)" strokeWidth={1} />
      <circle cx={C} cy={C} r={R} fill="url(#dd-face)" stroke="var(--color-line-strong)" strokeWidth={2} />

      {minutes !== null && <path d={wedge(minuteAngle, R - 6)} fill={color} opacity={0.22} />}

      {Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        const a = polar(i * 6, R - 4);
        const b = polar(i * 6, R - (major ? 14 : 8));
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={i === 0 ? "var(--color-alarm)" : major ? "var(--color-bone)" : "var(--color-line-strong)"}
            strokeWidth={major ? 3 : 1.5}
            strokeLinecap="round"
          />
        );
      })}

      <text
        x={C}
        y={40}
        textAnchor="middle"
        fill="var(--color-alarm)"
        fontSize={13}
        fontWeight={700}
        fontFamily="var(--font-mono)"
        letterSpacing={1}
      >
        XII
      </text>

      <g transform={`rotate(${hourAngle} ${C} ${C})`}>
        <line x1={C} y1={C + 10} x2={C} y2={C - 46} stroke="var(--color-bone)" strokeWidth={6} strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minuteAngle} ${C} ${C})`}>
        <line x1={C} y1={C + 14} x2={C} y2={C - 74} stroke={color === "var(--color-line-strong)" ? "var(--color-fog)" : color} strokeWidth={3.5} strokeLinecap="round" />
      </g>
      <circle cx={C} cy={C} r={6} fill="var(--color-bone)" />
      <circle cx={C} cy={C} r={2.5} fill="var(--color-void)" />

      {minutes === null && (
        <text
          x={C}
          y={C + 48}
          textAnchor="middle"
          fill="var(--color-fog)"
          fontSize={30}
          fontWeight={700}
          fontFamily="var(--font-mono)"
        >
          ?
        </text>
      )}
    </svg>
  );
}
