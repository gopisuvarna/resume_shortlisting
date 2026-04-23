interface Props { message: string; onClose?: () => void; className?: string }

export default function ErrorAlert({ message, onClose, className = '' }: Readonly<Props>) {
  if (!message) return null
  return (
    <div className={`flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 ${className}`}>
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="flex-1 whitespace-pre-line leading-relaxed">{message}</p>
      {onClose && (
        <button onClick={onClose} className="text-red-400 hover:text-red-600 transition-colors text-lg leading-none -mt-0.5">×</button>
      )}
    </div>
  )
}
