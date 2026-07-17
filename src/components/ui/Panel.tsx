import type { ReactNode } from 'react';

interface PanelProps {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** A titled content region. Used sparingly; not every block needs a panel. */
export function Panel({ title, hint, children, className = '', style }: PanelProps) {
  return (
    <section className={`panel p-5 ${className}`} style={style}>
      {title && (
        <header className="mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-[var(--text-faint)]">{hint}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
