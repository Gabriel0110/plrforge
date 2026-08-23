export function LoadingState() {
  return (
    <div aria-label="Loading player" className="grid min-h-0 flex-1 grid-cols-[208px_minmax(0,1fr)_300px]">
      <div className="border-r border-white/[0.08] p-4"><div className="skeleton h-8 w-28" />{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton mt-3 h-9 w-full" />)}</div>
      <div className="p-6"><div className="skeleton h-11 w-full" /><div className="mt-7 grid grid-cols-10 gap-1.5">{Array.from({ length: 50 }, (_, index) => <div key={index} className="skeleton aspect-square" />)}</div></div>
      <div className="border-l border-white/[0.08] p-6"><div className="skeleton h-16 w-16" /><div className="skeleton mt-5 h-5 w-44" /><div className="skeleton mt-8 h-10 w-full" /><div className="skeleton mt-4 h-10 w-full" /></div>
    </div>
  );
}
