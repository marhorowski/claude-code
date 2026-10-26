/* eslint-disable @next/next/no-img-element */
export function AdThumb({ src, size = 40 }: { src: string | null | undefined; size?: number }) {
  if (!src)
    return (
      <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400">
        brak
      </div>
    );
  return <img src={src} alt="" width={size} height={size} loading="lazy" className="shrink-0 rounded object-cover" style={{ width: size, height: size }} />;
}
