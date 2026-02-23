import { useState, useEffect, useRef } from 'react'
import { lookupRecords } from '../services/flowForgeApi.js'

/**
 * value: '' | { id: string, name: string } | { id: null, name: string }
 *   - ''                    → nothing selected
 *   - { id, name }          → existing SF record selected
 *   - { id: null, name }    → new record to be created with this Name
 *
 * onChange(value) is called with one of the above.
 */
export default function LookupField({ orgId, sobjectType, value, onChange, required }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    setSearchError(null)
    if (!query || query.length < 2) {
      setResults([])
      setOpen(false)
      clearTimeout(debounceRef.current)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!sobjectType) return
      setSearching(true)
      try {
        const { data } = await lookupRecords(orgId, sobjectType, query)
        setResults(Array.isArray(data) ? data : [])
        setOpen(true)
      } catch (err) {
        setSearchError(err.response?.data?.error || 'Search failed')
        setResults([])
        setOpen(true) // still open to show the "create new" option
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query, orgId, sobjectType])

  const handleSelectExisting = (record) => {
    onChange({ id: record.id, name: record.name })
    setQuery('')
    setOpen(false)
    setResults([])
    setSearchError(null)
  }

  const handleUseAsNew = () => {
    onChange({ id: null, name: query })
    setQuery('')
    setOpen(false)
    setResults([])
    setSearchError(null)
  }

  const handleClear = () => {
    onChange('')
    setQuery('')
    setResults([])
    setOpen(false)
    setSearchError(null)
  }

  const objectLabel = sobjectType || 'record'
  const isSelected = value && typeof value === 'object' && value.name
  const isExisting = isSelected && value.id
  const isNew = isSelected && !value.id

  // ── Selected state ──────────────────────────────────────────────────
  if (isSelected) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border ${
        isExisting ? 'bg-slate-900 border-indigo-500' : 'bg-emerald-950/40 border-emerald-500/60'
      }`}>
        <div className="flex-1 min-w-0">
          {isNew && (
            <div className="text-xs text-emerald-400 font-medium mb-0.5">Create new {objectLabel}</div>
          )}
          <div className="text-sm text-slate-200 truncate">{value.name}</div>
          {isExisting && (
            <div className="text-xs text-slate-500 font-mono truncate">{value.id}</div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-slate-400 hover:text-white text-xl leading-none shrink-0 transition-colors"
        >
          ×
        </button>
      </div>
    )
  }

  // ── Search input + dropdown ──────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search existing ${objectLabel}, or type a name to create new…`}
          required={required && !isSelected}
          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-colors pr-8"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-indigo-500/40 border-t-indigo-400 rounded-full animate-spin" />
        )}
      </div>

      {searchError && (
        <p className="mt-1 text-xs text-red-400">{searchError}</p>
      )}

      {open && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden">
          {/* Existing record results */}
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelectExisting(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between gap-3 border-b border-slate-700/50"
            >
              <span className="text-sm text-slate-200 truncate">{r.name}</span>
              <span className="text-xs text-slate-500 font-mono shrink-0">{String(r.id || '').slice(0, 8)}…</span>
            </button>
          ))}

          {/* Always show "create new" option when there's a query */}
          <button
            type="button"
            onClick={handleUseAsNew}
            className="w-full text-left px-3 py-2.5 hover:bg-emerald-900/40 transition-colors flex items-center gap-2 border-t border-slate-700/50"
          >
            <span className="text-emerald-400 text-base leading-none">+</span>
            <span className="text-sm text-emerald-300">
              Create new {objectLabel} named <span className="font-semibold">"{query}"</span>
            </span>
          </button>

          {results.length === 0 && !searching && (
            <div className="px-3 py-2 text-xs text-slate-500 text-center border-b border-slate-700/50">
              No existing {objectLabel} records found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
