interface Props { size?: 'sm' | 'md' | 'lg'; color?: 'indigo' | 'violet' | 'white' }

const sizes  = { sm: 'w-4 h-4 border-2', md: 'w-7 h-7 border-[3px]', lg: 'w-11 h-11 border-4' }
const colors = { indigo: 'border-indigo-600', violet: 'border-violet-600', white: 'border-white' }

export default function LoadingSpinner({ size = 'md', color = 'indigo' }: Props) {
  return (
    <div className={`animate-spin rounded-full border-t-transparent ${sizes[size]} ${colors[color]}`} />
  )
}

export function PageLoader({ color = 'indigo' }: { color?: 'indigo' | 'violet' }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" color={color} />
      <p className="text-sm text-slate-400 animate-pulse">Loading…</p>
    </div>
  )
}

export function InlineLoader() {
  return (
    <div className="flex justify-center py-16">
      <LoadingSpinner size="md" />
    </div>
  )
}
