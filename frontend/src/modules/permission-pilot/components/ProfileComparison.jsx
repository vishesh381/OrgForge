import { useState } from 'react'
import { GitCompareArrows, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

const PERM_FIELDS = [
  { key: 'read',      label: 'Read' },
  { key: 'create',    label: 'Create' },
  { key: 'edit',      label: 'Edit' },
  { key: 'delete',    label: 'Delete' },
  { key: 'viewAll',   label: 'View All' },
  { key: 'modifyAll', label: 'Modify All' },
]

function PermCell({ value }) {
  if (value === true || value === 'true') {
    return (
      <span className="flex items-center justify-center">
        <CheckCircle2 className="w-4 h-4 text-green-400" />
      </span>
    )
  }
  return (
    <span className="flex items-center justify-center">
      <XCircle className="w-4 h-4 text-slate-600" />
    </span>
  )
}

export default function ProfileComparison({ profiles = [], onCompare }) {
  const [profileA, setProfileA] = useState('')
  const [profileB, setProfileB] = useState('')
  const [result, setResult] = useState(null)
  const [diffRows, setDiffRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCompare = async () => {
    if (!profileA || !profileB) return
    if (profileA === profileB) {
      setError('Please select two different profiles to compare.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setDiffRows([])

    try {
      const comparison = await onCompare(profileA, profileB)
      setResult(comparison)

      // Parse the diffJson
      let rows = []
      if (comparison?.diffJson) {
        try {
          rows = JSON.parse(comparison.diffJson)
        } catch {
          rows = []
        }
      }
      setDiffRows(rows)
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Comparison failed.')
    } finally {
      setLoading(false)
    }
  }

  const profileAName = profiles.find((p) => p.name === profileA)?.name || profileA
  const profileBName = profiles.find((p) => p.name === profileB)?.name || profileB

  return (
    <div className="space-y-6">
      {/* Selector row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Profile A</label>
          <select
            value={profileA}
            onChange={(e) => setProfileA(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500"
          >
            <option value="">-- Select profile --</option>
            {profiles.map((p) => (
              <option key={`a-${p.id}`} value={p.name}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:flex items-center pt-5">
          <GitCompareArrows className="w-5 h-5 text-slate-500" />
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-1">Profile B</label>
          <select
            value={profileB}
            onChange={(e) => setProfileB(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500"
          >
            <option value="">-- Select profile --</option>
            {profiles.map((p) => (
              <option key={`b-${p.id}`} value={p.name}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </div>

        <div className="sm:pb-0">
          <button
            onClick={handleCompare}
            disabled={!profileA || !profileB || loading}
            className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Comparing…' : 'Compare'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Result table */}
      {result && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Diff: <span className="text-indigo-400">{profileAName}</span> vs{' '}
              <span className="text-indigo-400">{profileBName}</span>
            </h3>
            <span className="text-xs text-slate-500">
              {diffRows.length} object{diffRows.length !== 1 ? 's' : ''} differ
            </span>
          </div>

          {diffRows.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 bg-green-900/20 border border-green-700/30 rounded-lg px-4 py-3 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              No differences found — profiles have identical object permissions.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-medium">Object</th>
                    {PERM_FIELDS.map((f) => (
                      <th key={f.key} colSpan={2} className="text-center px-2 py-3 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-800/50 text-slate-500 text-xs border-b border-slate-700">
                    <th className="px-4 py-1" />
                    {PERM_FIELDS.map((f) => (
                      <>
                        <th key={`${f.key}-a`} className="text-center px-2 py-1 text-indigo-400/70">A</th>
                        <th key={`${f.key}-b`} className="text-center px-2 py-1 text-purple-400/70">B</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {diffRows.map((row) => (
                    <tr
                      key={row.objectName}
                      className="bg-slate-900 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-slate-300 font-mono text-xs">
                        {row.objectName}
                      </td>
                      {PERM_FIELDS.map((f) => {
                        const valA = row[`${f.key}A`]
                        const valB = row[`${f.key}B`]
                        const differs = Boolean(valA) !== Boolean(valB)
                        return (
                          <>
                            <td
                              key={`${f.key}-a`}
                              className={`px-2 py-2.5 ${differs ? 'bg-amber-900/20' : ''}`}
                            >
                              <PermCell value={valA} />
                            </td>
                            <td
                              key={`${f.key}-b`}
                              className={`px-2 py-2.5 ${differs ? 'bg-amber-900/20' : ''}`}
                            >
                              <PermCell value={valB} />
                            </td>
                          </>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
