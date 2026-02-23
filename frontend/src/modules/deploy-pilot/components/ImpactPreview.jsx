import { AlertTriangle, GitBranch, CheckCircle } from 'lucide-react'

export default function ImpactPreview({ impact }) {
  if (!impact) return null

  const { components = [], impactedCount = 0, impactedComponents = [], dependencies = [] } = impact
  const isHighImpact = impactedCount > 10

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${
        isHighImpact
          ? 'bg-yellow-500/10 border-yellow-500/30'
          : impactedCount > 0
          ? 'bg-indigo-500/10 border-indigo-500/30'
          : 'bg-green-500/10 border-green-500/30'
      }`}>
        {isHighImpact ? (
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
        ) : impactedCount > 0 ? (
          <GitBranch className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className={`text-sm font-semibold ${
            isHighImpact ? 'text-yellow-300' : impactedCount > 0 ? 'text-indigo-300' : 'text-green-300'
          }`}>
            {impactedCount === 0
              ? 'No dependencies found'
              : `${impactedCount} component${impactedCount !== 1 ? 's' : ''} affected`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzed {components.length} component{components.length !== 1 ? 's' : ''}
            {isHighImpact ? ' — high impact change, review carefully' : ''}
          </p>
        </div>
      </div>

      {/* Impacted components list */}
      {impactedComponents.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Impacted Components
          </h4>
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-slate-700/40">
              <thead className="bg-slate-800/40">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Dependent</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-400">References</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {dependencies.slice(0, 50).map((dep, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2 text-sm text-white font-medium">
                      {dep.dependentName || '—'}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded font-mono">
                        {dep.dependentType || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{dep.referencedName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dependencies.length > 50 && (
              <div className="px-4 py-2 text-xs text-slate-500 text-center border-t border-slate-700/40">
                +{dependencies.length - 50} more dependencies
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
