import { Inbox } from 'lucide-react'

export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-12 h-12 text-slate-600 mb-4" />
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
