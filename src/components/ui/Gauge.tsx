interface GaugeProps {
  /** 0..1+ progress. Values above 1 clamp the arc but show the real % text. */
  progress: number;
  size?: number;
  label?: string;
}

/** Semicircular progress arc for FIRE progress. */
export function Gauge({ progress, size = 200, label }: GaugeProps) {
  const stroke = 16;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const semi = Math.PI * r; // length of a 180deg arc
  const clamped = Math.min(Math.max(progress, 0), 1);
  const pct = Math.round(progress * 100);

  const arc = (radius: number) =>
    `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
      <svg width={size} height={size / 2 + 16}>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(55% 0.17 280)" />
            <stop offset="100%" stopColor="oklch(72% 0.18 290)" />
          </linearGradient>
        </defs>
        <path d={arc(r)} fill="none" stroke="var(--line)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arc(r)}
          fill="none"
          stroke="url(#gauge)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${clamped * semi} ${semi}`}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="num text-3xl font-bold text-[var(--text)]">{pct}%</span>
        {label && <span className="label mt-1">{label}</span>}
      </div>
    </div>
  );
}
