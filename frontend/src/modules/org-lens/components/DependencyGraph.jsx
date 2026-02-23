import { useMemo, useState } from 'react'
import { ArrowRight, Layers, Info } from 'lucide-react'

const TYPE_COLOR = {
  ApexClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Flow: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  CustomObject: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  CustomField: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  Profile: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  PermissionSet: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  ValidationRule: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Layout: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
}

const D3_THRESHOLD = 100

function TypeBadge({ type }) {
  const cls = TYPE_COLOR[type] ?? 'bg-slate-700/40 text-slate-300 border-slate-600/50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {type ?? 'Unknown'}
    </span>
  )
}

/**
 * DependencyGraph
 * Renders dependencies as a grouped table (source → targets).
 * When dep count exceeds D3_THRESHOLD, shows an installation hint for D3.
 *
 * Props:
 *   dependencies  {Array<{ sourceName, sourceType, targetName, targetType, dependencyType }>}
 */
export default function DependencyGraph({ dependencies = [] }) {
  const [search, setSearch] = useState('')
  const [expandedSources, setExpandedSources] = useState(new Set())

  // Group by source
  const grouped = useMemo(() => {
    const map = new Map()
    for (const dep of dependencies) {
      const key = `${dep.sourceType}::${dep.sourceName}`
      if (!map.has(key)) {
        map.set(key, { sourceName: dep.sourceName, sourceType: dep.sourceType, targets: [] })
      }
      map.get(key).targets.push({ name: dep.targetName, type: dep.targetType, depType: dep.dependencyType })
    }
    return Array.from(map.values()).sort((a, b) => (a.sourceName ?? '').localeCompare(b.sourceName ?? ''))
  }, [dependencies])

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped
    const q = search.toLowerCase()
    return grouped.filter(
      (g) =>
        (g.sourceName ?? '').toLowerCase().includes(q) ||
        (g.sourceType ?? '').toLowerCase().includes(q) ||
        g.targets.some(
          (t) =>
            (t.name ?? '').toLowerCase().includes(q) ||
            (t.type ?? '').toLowerCase().includes(q)
        )
    )
  }, [grouped, search])

  function toggleSource(key) {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (dependencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Layers className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-white font-medium">No dependencies loaded</p>
        <p className="text-slate-500 text-sm mt-1">
          Dependencies are fetched from the Salesforce Tooling API (MetadataComponentDependency).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* D3 hint banner */}
      {dependencies.length >= D3_THRESHOLD && (
        <div className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-lg text-sm text-indigo-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>{dependencies.length} dependencies</strong> detected. Install D3.js for an
            interactive graph visualisation.
          </span>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Filter by component name or type…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-md text-sm focus:outline-none focus:border-indigo-500 transition-colors"
      />

      {/* Summary */}
      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {grouped.length} source components
        {search && ` matching "${search}"`}
      </p>

      {/* Groups */}
      <div className="space-y-1">
        {filtered.map((group) => {
          const key = `${group.sourceType}::${group.sourceName}`
          const isOpen = expandedSources.has(key)
          return (
            <div key={key} className="bg-slate-800/60 border border-slate-700/60 rounded-lg overflow-hidden">
              {/* Source row — toggle */}
              <button
                onClick={() => toggleSource(key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TypeBadge type={group.sourceType} />
                  <span className="text-sm font-medium text-white truncate">{group.sourceName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-xs text-slate-500">
                    {group.targets.length} dep{group.targets.length !== 1 ? 's' : ''}
                  </span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Target rows */}
              {isOpen && (
                <div className="border-t border-slate-700/50 divide-y divide-slate-700/30">
                  {group.targets.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-6 py-2.5 hover:bg-slate-700/20 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <TypeBadge type={t.type} />
                      <span className="text-sm text-slate-300 font-mono truncate">{t.name}</span>
                      {t.depType && (
                        <span className="ml-auto text-xs text-slate-600 italic shrink-0">{t.depType}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && search && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No components match &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  )
}
