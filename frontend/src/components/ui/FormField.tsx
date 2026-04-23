import { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export default function FormField({ label, required, hint, error, children, className = '' }: Readonly<FormFieldProps>) {
  return (
    <div className={className}>
      <label className={`label ${required ? 'label-required' : ''}`}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  )
}
