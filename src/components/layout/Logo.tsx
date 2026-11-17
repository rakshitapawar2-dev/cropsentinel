import { cn } from '../../lib/utils'

/**
 * CropSentinel wordmark: a leaf whose stem becomes a monitoring signal.
 * Drawn as SVG so it stays sharp on phones and desktops alike.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="CropSentinel leaf and signal mark"
      className={cn('h-9 w-9', className)}
    >
      <rect width="40" height="40" rx="11" fill="#12301f" />
      <path d="M20 29V15" stroke="#c1ecc6" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M20 20c0-6 3.6-9.8 9.5-11-1.2 7-4.4 10.6-9.5 11Z"
        fill="#55c164"
      />
      <path
        d="M20 24c0-5.2-3.2-8.4-8.4-9.4 1 6 3.9 9 8.4 9.4Z"
        fill="#8edb98"
      />
      <circle cx="20" cy="31.5" r="2" fill="#ffe9b3" />
      <path d="M15.5 33.5h9" stroke="#ffe9b3" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function Logo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span
          className={cn(
            'block text-[1.05rem] font-bold tracking-tight',
            light ? 'text-white' : 'text-forest-900',
          )}
        >
          Crop<span className={light ? 'text-leaf-300' : 'text-forest-600'}>Sentinel</span>
        </span>
        {!compact && (
          <span className={cn('block text-[0.68rem] font-medium uppercase tracking-[0.14em]', light ? 'text-forest-200' : 'text-forest-500')}>
            Agricultural assistant
          </span>
        )}
      </span>
    </span>
  )
}
