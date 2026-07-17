interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

/** Lightweight SVG donut. Avoids a chart lib for a crisp small visual. */
export function Donut({
  segments,
  size = 168,
  thickness = 18,
  centerLabel,
  centerValue,
}: DonutProps) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg, i) => {
            const frac = Math.max(0, seg.value) / total;
            const len = frac * c;
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {(centerValue || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="num text-xl font-semibold text-[var(--text)]">{centerValue}</span>}
          {centerLabel && <span className="label mt-1">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
