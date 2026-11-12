export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#0e1b31" stroke="#22385c" />
        {/* signal arcs: a voice becoming a decision */}
        <path d="M9 21c0-4 3-7 7-7" stroke="#38d6e6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M5 21c0-6.1 4.9-11 11-11" stroke="#38d6e6" strokeOpacity=".45" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="21" r="2.6" fill="#21c8a2" />
        <path d="M19.5 17.5 26 11" stroke="#21c8a2" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M21.5 10.5H26.5V15.5" stroke="#21c8a2" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-[0.18em]">MITRA</p>
        {!compact && <p className="text-[10px] text-faint">Missed-demand Intelligence</p>}
      </div>
    </div>
  );
}
