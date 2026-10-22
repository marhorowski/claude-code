// Szkielet w rozmiarze docelowej treści, żeby nic nie skakało po załadowaniu.
const Block = ({ className }: { className: string }) => <div className={`animate-pulse rounded-xl bg-soft ${className}`} />;

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex flex-wrap items-center gap-3">
        <Block className="h-10 w-72" />
        <Block className="ml-auto h-10 w-64" />
      </div>
      <div className="card overflow-hidden">
        <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2 bg-card p-5">
              <Block className="h-4 w-24" />
              <Block className="h-8 w-28" />
              <Block className="h-8 w-full" />
            </div>
          ))}
        </div>
        <div className="p-6"><Block className="h-[240px] w-full" /></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Block className="h-56" />
        <Block className="h-56" />
      </div>
    </div>
  );
}
