export function BrandMark({ size = 24, className }: { size?: number; className?: string }) {
  // Three stacked blocks forming a stable base: goal → modules → routine.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="2" y="15" width="20" height="7" rx="2" fill="currentColor" />
      <rect x="5" y="8.5" width="14" height="5" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="8" y="2" width="8" height="5" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-foreground">
      <BrandMark className="text-primary" />
      Systems HQ
    </span>
  );
}
