import { useState, useEffect } from 'react'
import { getFlowInputs } from '../services/flowForgeApi.js'
import LookupField from './LookupField.jsx'

function inputTypeFor(sfType) {
  switch ((sfType || '').toUpperCase()) {
    case 'NUMBER': case 'INTEGER': case 'DOUBLE': case 'CURRENCY': case 'PERCENT': return 'number'
    case 'DATE': return 'date'
    case 'DATETIME': return 'datetime-local'
    case 'BOOLEAN': return 'checkbox'
    default: return 'text'
  }
}

export default function RunFlowModal({ flow, orgId, onRun, onClose }) {
  const [inputVars, setInputVars] = useState([])
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [running, setRunning] = useState(false)

  // Use invocableApiName if known (namespaced), else fall back to plain apiName
  const effectiveApiName = flow?.invocableApiName || flow?.apiName
  // Only AutoLaunched flows registered in the SF Actions API can be run from OrgForge
  const isInvocable = !!flow?.invocable

  useEffect(() => {
    // Skip API call entirely for non-invocable flows — they are not in SF Actions API
    if (!isInvocable) {
      setLoading(false)
      return
    }
    if (!effectiveApiName || !orgId) return
    setLoading(true)
    setFetchError(null)
    getFlowInputs(orgId, effectiveApiName)
      .then(({ data }) => {
        const vars = Array.isArray(data) ? data : []
        setInputVars(vars)
        const defaults = {}
        vars.forEach((v) => {
          defaults[v.name] = (v.type || '').toUpperCase() === 'BOOLEAN' ? false : ''
        })
        setValues(defaults)
      })
      .catch((err) => setFetchError(err.response?.data?.message || 'Failed to load input variables'))
      .finally(() => setLoading(false))
  }, [flow, orgId])

  const handleChange = (name, raw, sfType) => {
    const isBool = (sfType || '').toUpperCase() === 'BOOLEAN'
    setValues((prev) => ({ ...prev, [name]: isBool ? raw : raw }))
  }

  const handleRun = async () => {
    const inputMap = {}
    inputVars.forEach((v) => {
      const val = values[v.name]
      const t = (v.type || '').toUpperCase()
      if (t === 'BOOLEAN') {
        inputMap[v.name] = val === true || val === 'true'
      } else if (val !== '' && val !== null && val !== undefined) {
        if (['NUMBER', 'INTEGER', 'DOUBLE', 'CURRENCY', 'PERCENT'].includes(t)) {
          inputMap[v.name] = parseFloat(val)
        } else if (t === 'SOBJECT' && v.sobjectType && val) {
          if (typeof val === 'object' && val.id) {
            // Existing record picked from lookup
            inputMap[v.name] = { attributes: { type: v.sobjectType }, Id: val.id }
          } else if (typeof val === 'object' && val.name) {
            // "Create new" chosen — pass Name so the flow can create the record
            inputMap[v.name] = { attributes: { type: v.sobjectType }, Name: val.name }
          } else if (typeof val === 'string' && val.length > 0) {
            // Fallback: bare ID string
            inputMap[v.name] = { attributes: { type: v.sobjectType }, Id: val }
          }
        } else {
          inputMap[v.name] = val
        }
      }
    })
    setRunning(true)
    try {
      await onRun(flow, inputMap)
    } finally {
      setRunning(false)
      onClose()
    }
  }

  const canRun = isInvocable && !loading && !fetchError && !running

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Run Flow</h3>
              {!isInvocable && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-600/60 text-slate-400 border border-slate-600">
                  Not Invocable
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5 truncate max-w-sm">{flow?.label}</p>
            <p className="text-xs text-slate-600 mt-0.5 truncate max-w-sm font-mono">{effectiveApiName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-2xl leading-none ml-4 shrink-0"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          {!isInvocable ? (
            <div className="p-5 bg-slate-700/20 border border-slate-600/50 rounded-xl text-center space-y-2">
              <div className="text-2xl">🔒</div>
              <p className="text-slate-200 text-sm font-medium">Cannot run from OrgForge</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                <span className="font-semibold text-slate-300">{flow?.processType || 'This flow type'}</span> flows
                are not registered in the Salesforce Invocable Actions API.<br />
                Only <span className="text-indigo-300 font-medium">AutoLaunched flows</span> marked as invocable
                can be executed from OrgForge.
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Run this flow directly from <span className="text-slate-400">Salesforce Setup → Flows</span>.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-slate-700/50 rounded-lg" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="p-3 bg-red-400/10 border border-red-400/30 rounded-lg text-sm text-red-400">
              {fetchError}
            </div>
          ) : inputVars.length === 0 ? (
            <div className="p-5 bg-slate-700/30 rounded-xl text-center">
              <p className="text-slate-300 text-sm font-medium">No input variables required</p>
              <p className="text-slate-500 text-xs mt-1">This flow will run immediately with no inputs.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {inputVars.map((v) => {
                const isBool = (v.type || '').toUpperCase() === 'BOOLEAN'
                const htmlType = inputTypeFor(v.type)
                return (
                  <div key={v.name}>
                    {!isBool && (
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {v.label || v.name}
                        {v.required && <span className="text-red-400 ml-1">*</span>}
                        <span className="ml-2 text-xs text-slate-500 font-normal font-mono">
                          ({(v.type || '').toUpperCase() === 'SOBJECT' && v.sobjectType
                              ? v.sobjectType
                              : v.type || 'String'})
                        </span>
                      </label>
                    )}
                    {v.description && (
                      <p className="text-xs text-slate-500 mb-1.5">{v.description}</p>
                    )}
                    {isBool ? (
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={!!values[v.name]}
                          onChange={(e) => handleChange(v.name, e.target.checked, v.type)}
                          className="w-4 h-4 rounded accent-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-slate-300">
                            {v.label || v.name}
                            {v.required && <span className="text-red-400 ml-1">*</span>}
                          </span>
                          {v.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{v.description}</p>
                          )}
                        </div>
                      </label>
                    ) : (['REFERENCE', 'SOBJECT'].includes((v.type || '').toUpperCase()) && v.sobjectType) ? (
                      <LookupField
                        orgId={orgId}
                        sobjectType={v.sobjectType}
                        value={values[v.name] ?? ''}
                        onChange={(val) => handleChange(v.name, val, v.type)}
                        required={v.required}
                      />
                    ) : (
                      <input
                        type={htmlType}
                        value={values[v.name] ?? ''}
                        onChange={(e) => handleChange(v.name, e.target.value, v.type)}
                        placeholder={
                          (v.type || '').toUpperCase() === 'REFERENCE'
                            ? 'Paste Salesforce record ID (e.g. 001…)'
                            : `Enter ${v.label || v.name}`
                        }
                        required={v.required}
                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors min-w-24 text-center"
          >
            {running ? 'Running...' : !isInvocable ? 'Not Runnable' : 'Run Flow'}
          </button>
        </div>
      </div>
    </div>
  )
}
