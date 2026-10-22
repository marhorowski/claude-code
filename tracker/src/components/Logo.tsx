/** Sygnet (niemożliwy trójkąt, kolory TrifectaOS) + wordmark „KPI-Tracker”; wersja na jasne tło. */
export function Logo({ size = 22, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center" style={{ gap: size * 0.3 }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
        <polygon points="8,90 92,90 66,76 31,70" fill="#161513" />
        <polygon points="92,90 50,6 58,41 66,76" fill="#8A5A12" />
        <polygon points="50,6 8,90 31,70 58,41" fill="#F5A01B" />
      </svg>
      {wordmark && (
        <span className="font-display font-extrabold tracking-[-0.02em] text-ink" style={{ fontSize: size * 0.82 }}>
          KPI-<span className="text-accent">Tracker</span>
        </span>
      )}
    </span>
  );
}
