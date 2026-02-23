import { Database } from 'lucide-react'

export default function QueryResult({ jsonResults }) {
  if (!jsonResults) return null

  let parsed
  try {
    parsed = typeof jsonResults === 'string' ? JSON.parse(jsonResults) : jsonResults
  } catch {
    return (
      <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
        <p className="text-xs text-red-400">Could not parse query results.</p>
      </div>
    )
  }

  const totalSize = parsed?.totalSize ?? 0
  const records = parsed?.records ?? []

  if (totalSize === 0 || records.length === 0) {
    return (
      <div className="mt-3 px-3 py-2.5 bg-slate-900/60 border border-slate-700/40 rounded-lg flex items-center gap-2">
        <Database size={13} className="text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-400">No records returned.</span>
      </div>
    )
  }

  // Build column list from first record, excluding SF internal 'attributes'
  const columns = Object.keys(records[0]).filter(k => k !== 'attributes')

  return (
    <div className="mt-3">
      {/* Record count badge */}
      <div className="flex items-center gap-2 mb-2">
        <Database size={13} className="text-indigo-400" />
        <span className="text-xs font-medium text-indigo-300">
          {totalSize} record{totalSize !== 1 ? 's' : ''} returned
        </span>
      </div>

      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/80">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-left font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap border-b border-slate-700/50"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {records.map((record, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                {columns.map(col => {
                  const val = record[col]
                  const display = val === null || val === undefined
                    ? <span className="text-slate-600 italic">null</span>
                    : typeof val === 'object'
                    ? <span className="text-slate-400 font-mono">{JSON.stringify(val)}</span>
                    : <span className="text-slate-200">{String(val)}</span>
                  return (
                    <td key={col} className="px-3 py-2 whitespace-nowrap max-w-xs truncate">
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
