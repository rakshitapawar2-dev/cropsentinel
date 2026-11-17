import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-forest-700 text-white hover:bg-forest-800 focus-visible:outline-forest-700 disabled:bg-forest-300',
  secondary:
    'bg-white text-forest-800 border border-forest-200 hover:bg-forest-50 focus-visible:outline-forest-600',
  ghost: 'text-forest-800 hover:bg-forest-50 focus-visible:outline-forest-600',
  danger: 'bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5 gap-1.5',
  md: 'text-[0.95rem] px-4 py-2.5 gap-2',
  lg: 'text-base px-5 py-3 gap-2.5',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-70',
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
  as: Element = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  return (
    <Element className={cn('rounded-2xl border border-forest-100 bg-white p-5 shadow-soft', className)}>
      {children}
    </Element>
  )
}

type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-sand text-ink border-forest-100',
  green: 'bg-leaf-100 text-forest-800 border-leaf-200',
  amber: 'bg-amber-50 text-amber-900 border-amber-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-sky-50 text-sky-900 border-sky-200',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  icon,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  icon?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 rounded-xl bg-forest-50 p-2 text-forest-700" aria-hidden>
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-forest-900 sm:text-[1.7rem]">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-[0.95rem] leading-relaxed text-forest-700">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode
  title: string
  body?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest-200 bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 rounded-2xl bg-forest-50 p-3 text-forest-600" aria-hidden>
        {icon}
      </span>
      <h2 className="text-lg font-semibold text-forest-900">{title}</h2>
      {body && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-forest-700">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Notice({
  tone = 'neutral',
  title,
  children,
  icon,
}: {
  tone?: BadgeTone
  title?: string
  children: ReactNode
  icon?: ReactNode
}) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'border-forest-100 bg-white text-forest-800',
    green: 'border-leaf-200 bg-leaf-50 text-forest-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
  }
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed', tones[tone])}>
      {icon && (
        <span className="mt-0.5 shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-1' : undefined}>{children}</div>
      </div>
    </div>
  )
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8', className)}>{children}</div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-forest-100 bg-cream/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-forest-600">{label}</p>
      <p className="mt-1 text-xl font-bold text-forest-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-forest-600">{hint}</p>}
    </div>
  )
}
