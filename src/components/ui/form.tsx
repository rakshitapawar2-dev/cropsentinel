import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const controlClasses =
  'w-full rounded-xl border border-forest-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-ink placeholder:text-forest-400/90 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-200 disabled:bg-sand/60'

export function Field({
  label,
  hint,
  error,
  required,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-forest-900">
        {label}
        {required && (
          <span className="ml-1 text-red-700" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-relaxed text-forest-600">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function TextInput({ label, hint, className, id, ...rest }: TextInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const input = <input id={inputId} {...rest} className={cn(controlClasses, className)} />
  if (!label) return input
  return (
    <Field label={label} hint={hint} htmlFor={inputId} required={rest.required}>
      {input}
    </Field>
  )
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function TextArea({ label, hint, className, id, ...rest }: TextAreaProps) {
  const generatedId = useId()
  const areaId = id ?? generatedId
  const area = <textarea id={areaId} {...rest} className={cn(controlClasses, 'min-h-[92px] resize-y', className)} />
  if (!label) return area
  return (
    <Field label={label} hint={hint} htmlFor={areaId} required={rest.required}>
      {area}
    </Field>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
}

export function Select({ label, hint, className, id, children, ...rest }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const select = (
    <select id={selectId} {...rest} className={cn(controlClasses, 'pr-8', className)}>
      {children}
    </select>
  )
  if (!label) return select
  return (
    <Field label={label} hint={hint} htmlFor={selectId} required={rest.required}>
      {select}
    </Field>
  )
}

export function FormRow({ children, columns = 2 }: { children: ReactNode; columns?: 1 | 2 }) {
  return <div className={cn('grid gap-4', columns === 2 ? 'sm:grid-cols-2' : '')}>{children}</div>
}
