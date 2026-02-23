import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

/**
 * Maps CSV columns to Salesforce fields.
 * Props:
 *   csvHeaders: string[]
 *   sfFields: { name: string, label: string, type: string, required: boolean }[]
 *   onMappingChange: (mapping: { [csvColumn: string]: string }) => void
 */
export default function FieldMapper({ csvHeaders, sfFields, onMappingChange }) {
  const [mapping, setMapping] = useState({})
  const [mappingName, setMappingName] = useState('')
  const [saved, setSaved] = useState(false)

  // Auto-map by matching csv header name to sf field name (case-insensitive)
  useEffect(() => {
    if (!csvHeaders?.length || !sfFields?.length) return
    const initial = {}
    csvHeaders.forEach((col) => {
      const match = sfFields.find(
        (f) => f.name.toLowerCase() === col.toLowerCase() ||
               f.label.toLowerCase() === col.toLowerCase()
      )
      initial[col] = match ? match.name : ''
    })
    setMapping(initial)
    onMappingChange(initial)
  }, [csvHeaders, sfFields])

  const handleChange = (csvCol, sfField) => {
    const updated = { ...mapping, [csvCol]: sfField }
    setMapping(updated)
    onMappingChange(updated)
    setSaved(false)
  }

  const handleSave = () => {
    if (!mappingName.trim()) return
    setSaved(true)
    // Parent is responsible for calling the API via the "Save Mapping" action
    onMappingChange({ ...mapping, __mappingName__: mappingName.trim() })
  }

  if (!csvHeaders?.length) {
    return (
      <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-slate-500 text-sm">
        Upload a CSV file first to configure field mappings.
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Map CSV Columns to Salesforce Fields</h3>
        <span className="text-xs text-slate-500">{csvHeaders.length} columns</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-1/2">
                CSV Column
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-1/2">
                Salesforce Field
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {csvHeaders.map((col) => {
              const selected = mapping[col] || ''
              const isRequired = sfFields.find((f) => f.name === selected)?.required
              return (
                <tr key={col} className="hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-3">
                    <span className="text-sm text-slate-300 font-mono">{col}</span>
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={selected}
                      onChange={(e) => handleChange(col, e.target.value)}
                      className={`
                        w-full bg-slate-700 border rounded-lg px-3 py-1.5 text-sm text-white
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors
                        ${selected
                          ? isRequired
                            ? 'border-amber-500/40'
                            : 'border-green-500/40'
                          : 'border-slate-600'
                        }
                      `}
                    >
                      <option value="">-- Skip this column --</option>
                      {sfFields.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.label} ({f.name}) — {f.type}
                          {f.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-slate-700 flex items-center gap-3">
        <input
          type="text"
          value={mappingName}
          onChange={(e) => { setMappingName(e.target.value); setSaved(false) }}
          placeholder="Mapping name (to save for reuse)"
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSave}
          disabled={!mappingName.trim()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            saved
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : mappingName.trim()
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved' : 'Save Mapping'}
        </button>
      </div>
    </div>
  )
}
