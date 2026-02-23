export default function LoadingSpinner({ fullScreen, size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const spinner = (
    <div className={`${sizes[size]} border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin`} />
  )
  if (fullScreen) {
    return <div className="fixed inset-0 flex items-center justify-center bg-slate-900">{spinner}</div>
  }
  return <div className="flex items-center justify-center p-8">{spinner}</div>
}
