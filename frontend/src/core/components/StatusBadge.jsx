const variants = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  error:   'bg-red-500/20 text-red-400 border-red-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  info:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple:  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  default: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

function toVariant(status) {
  const s = (status || '').toLowerCase()
  if (['pass', 'success', 'completed', 'active'].includes(s)) return 'success'
  if (['fail', 'failed', 'error', 'critical', 'compilefail'].includes(s)) return 'error'
  if (['warning', 'medium', 'in_progress', 'processing'].includes(s)) return 'warning'
  if (['info', 'low', 'queued'].includes(s)) return 'info'
  return 'default'
}

export default function StatusBadge({ status, children, variant }) {
  const v = variant || toVariant(status)
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[v] || variants.default}`}>
      {children || status}
    </span>
  )
}
