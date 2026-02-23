import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

function formatDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dt
  }
}

export default function RollbackModal({ deployment, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)

  if (!deployment) return null

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setConfirming(true)
    try {
      await onConfirm(reason.trim())
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Confirm Rollback</h2>
              <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Deployment info */}
        <div className="p-6 border-b border-slate-700">
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 space-y-2.5">
            <InfoRow label="Label" value={deployment.label || 'Untitled'} />
            <InfoRow label="Status" value={deployment.status} />
            <InfoRow label="Type" value={deployment.deployType || '—'} />
            <InfoRow label="Components" value={deployment.componentCount} />
            <InfoRow label="Deployed By" value={deployment.deployedBy || '—'} />
            <InfoRow label="Started" value={formatDate(deployment.startedAt)} />
          </div>
        </div>

        {/* Reason textarea */}
        <div className="p-6 space-y-3">
          <label className="block text-sm font-medium text-slate-300">
            Rollback Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe why this deployment needs to be rolled back..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={confirming}
            className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-slate-700/60 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || confirming}
            className="px-5 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {confirming ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Rolling back...
              </>
            ) : (
              'Confirm Rollback'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs text-slate-300 font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}
