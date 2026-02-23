import { useState, useMemo } from 'react'

export default function TestClassSelector({ classes, selectedIds, onSelectionChange, loading }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!classes) return []
    if (!search) return classes
    return classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  }, [classes, search])

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selectedIds.includes(c.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      onSelectionChange(selectedIds.filter(id => !filtered.some(c => c.id === id)))
    } else {
      const newIds = [...new Set([...selectedIds, ...filtered.map(c => c.id)])]
      onSelectionChange(newIds)
    }
  }

  const toggleClass = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-slate-700 rounded"></div>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700">
        <input
          type="text"
          placeholder="Search test classes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-md text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAll}
            className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
          />
          Select All ({filtered.length})
        </label>
        <span className="text-sm text-slate-500">
          {selectedIds.length} selected
        </span>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-700/50">
        {filtered.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 text-center">
            {classes?.length === 0 ? 'No test classes found in this org.' : 'No matching classes.'}
          </p>
        ) : (
          filtered.map(cls => (
            <label
              key={cls.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/30 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(cls.id)}
                onChange={() => toggleClass(cls.id)}
                className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
              <span className="text-sm text-white">{cls.name}</span>
              {cls.namespacePrefix && (
                <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded">
                  {cls.namespacePrefix}
                </span>
              )}
            </label>
          ))
        )}
      </div>
    </div>
  )
}
