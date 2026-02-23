import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'

/**
 * Drag-and-drop CSV file uploader.
 * Props:
 *   onFileLoaded({ headers: string[], rows: object[], fileName: string })
 */
export default function FileUploader({ onFileLoaded }) {
  const [dragging, setDragging] = useState(false)
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const parseCSV = useCallback((text, fileName) => {
    try {
      const lines = text.split('\n').filter((l) => l.trim() !== '')
      if (lines.length < 2) {
        setError('CSV must have at least a header row and one data row.')
        return
      }

      const parseRow = (line) => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            inQuotes = !inQuotes
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        result.push(current.trim())
        return result
      }

      let headers = parseRow(lines[0])
      const rows = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseRow(lines[i])
        const row = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] !== undefined ? values[idx] : ''
        })
        rows.push(row)
      }

      // Auto-detect [ObjectName] in the first column of the first data row
      // e.g. first col header "_" with value "[Account]"
      let suggestedObject = null
      if (rows.length > 0) {
        const firstCol = headers[0]
        const firstVal = rows[0][firstCol] || ''
        const match = firstVal.match(/^\[([^\]]+)\]$/)
        if (match) {
          suggestedObject = match[1]
          // Strip the type column — it's not a real field
          const typeCol = headers[0]
          headers = headers.slice(1)
          rows.forEach((row) => { delete row[typeCol] })
        }
      }

      setLoaded({ fileName, rowCount: rows.length })
      setError(null)
      onFileLoaded({ headers, rows, fileName, suggestedObject })
    } catch (e) {
      setError('Failed to parse CSV: ' + e.message)
    }
  }, [onFileLoaded])

  const handleFile = useCallback((file) => {
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are accepted.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => parseCSV(e.target.result, file.name)
    reader.onerror = () => setError('Failed to read file.')
    reader.readAsText(file)
  }, [parseCSV])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }, [handleFile])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  return (
    <div className="w-full">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging
            ? 'border-indigo-400 bg-indigo-500/10'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />
        <Upload
          className={`w-10 h-10 ${dragging ? 'text-indigo-400' : 'text-slate-500'}`}
          strokeWidth={1.5}
        />
        {loaded ? (
          <div className="text-center">
            <p className="text-sm font-medium text-white">{loaded.fileName}</p>
            <p className="text-xs text-slate-400 mt-1">{loaded.rowCount.toLocaleString()} rows loaded</p>
            <p className="text-xs text-indigo-400 mt-2 underline">Click or drop to replace</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">
              {dragging ? 'Drop your CSV here' : 'Drag & drop a CSV file'}
            </p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}
