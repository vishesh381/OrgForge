import { useState, useEffect, useCallback } from 'react'
import { Database, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react'
import { useOrg } from '../../../core/hooks/useOrg.js'
import FileUploader from '../components/FileUploader.jsx'
import FieldMapper from '../components/FieldMapper.jsx'
import ImportProgress from '../components/ImportProgress.jsx'
import ImportHistory from '../components/ImportHistory.jsx'
import { getObjectFields, getJobs, getJob, createJob, saveMapping } from '../services/dataForgeApi.js'

const OPERATIONS = ['INSERT', 'UPDATE', 'UPSERT']

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Map Fields' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Progress' },
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const done = current > step.id
        const active = current === step.id
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                  done
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : active
                    ? 'bg-slate-800 border-indigo-500 text-indigo-400'
                    : 'bg-slate-800 border-slate-600 text-slate-500'
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  active ? 'text-indigo-400' : done ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 h-px mx-1 mb-5 transition-colors ${
                  current > step.id ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function DataForgeDashboard() {
  const { activeOrgId } = useOrg()

  // Wizard state
  const [step, setStep] = useState(1)

  // Step 1 — Upload
  const [csvData, setCsvData] = useState(null)        // { headers, rows, fileName }
  const [objectName, setObjectName] = useState('')
  const [operation, setOperation] = useState('INSERT')
  const [externalIdField, setExternalIdField] = useState('Id')

  // Step 2 — Map Fields
  const [sfFields, setSfFields] = useState([])
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [fieldsError, setFieldsError] = useState(null)
  const [mapping, setMapping] = useState({})           // { csvCol: sfField }
  const [pendingSaveName, setPendingSaveName] = useState(null)

  // Step 3 — (preview rendered inline)

  // Step 4 — Progress
  const [activeJob, setActiveJob] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState(null)

  // History
  const [jobs, setJobs] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ---------------------------------------------------------------------------
  // Load history on mount / org change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeOrgId) loadHistory()
  }, [activeOrgId])

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)
      const { data } = await getJobs(activeOrgId, 0)
      setJobs(data)
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Step transitions
  // ---------------------------------------------------------------------------

  const goToStep2 = async () => {
    if (!objectName.trim() || !csvData) return
    setFieldsError(null)
    setFieldsLoading(true)
    try {
      const { data } = await getObjectFields(activeOrgId, objectName.trim())
      setSfFields(data)
      setStep(2)
    } catch (e) {
      setFieldsError(e.response?.data?.message || 'Failed to fetch object fields.')
    } finally {
      setFieldsLoading(false)
    }
  }

  const handleMappingChange = (newMapping) => {
    const saveName = newMapping.__mappingName__
    if (saveName) {
      setPendingSaveName(saveName)
      const { __mappingName__: _, ...clean } = newMapping
      setMapping(clean)
    } else {
      setMapping(newMapping)
    }
  }

  // If user requested save mapping, do it after mapping state updates
  useEffect(() => {
    if (!pendingSaveName || !activeOrgId || !objectName) return
    const mappingJson = JSON.stringify(mapping)
    saveMapping({
      orgId: activeOrgId,
      objectName,
      mappingName: pendingSaveName,
      mappingJson,
      createdBy: 'user',
    }).catch(() => {})
    setPendingSaveName(null)
  }, [pendingSaveName])

  const goToStep3 = () => {
    if (!Object.values(mapping).some(Boolean)) return
    setStep(3)
  }

  const buildRecords = () => {
    if (!csvData) return []
    return csvData.rows.map((row) => {
      const record = {}
      Object.entries(mapping).forEach(([csvCol, sfField]) => {
        if (sfField && row[csvCol] !== undefined) {
          record[sfField] = row[csvCol]
        }
      })
      // Salesforce composite API requires attributes.type
      record.attributes = { type: objectName }
      return record
    })
  }

  const startImport = async () => {
    if (!activeOrgId || !csvData) return
    setImportError(null)
    setImportLoading(true)
    try {
      const records = buildRecords()
      const { data } = await createJob({
        orgId: activeOrgId,
        objectName,
        operation,
        externalIdField: operation === 'UPSERT' ? (externalIdField || 'Id') : null,
        fileName: csvData.fileName,
        records,
        createdBy: 'user',
      })
      setActiveJob(data)
      setStep(4)
    } catch (e) {
      setImportError(e.response?.data?.message || 'Failed to start import.')
    } finally {
      setImportLoading(false)
    }
  }

  const refreshActiveJob = useCallback(async () => {
    if (!activeJob?.id) return
    try {
      const { data } = await getJob(activeJob.id)
      setActiveJob(data)
      if (data.status === 'COMPLETED' || data.status === 'COMPLETED_WITH_ERRORS' || data.status === 'FAILED') {
        loadHistory()
      }
    } catch {
      // ignore
    }
  }, [activeJob?.id])

  const resetWizard = () => {
    setStep(1)
    setCsvData(null)
    setObjectName('')
    setOperation('INSERT')
    setExternalIdField('Id')
    setSfFields([])
    setMapping({})
    setActiveJob(null)
    setImportError(null)
    setFieldsError(null)
  }

  const handleSelectHistoryJob = async (job) => {
    try {
      const { data } = await getJob(job.id)
      setActiveJob(data)
      setStep(4)
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!activeOrgId) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">DataForge</h2>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">No Salesforce org connected.</p>
          <p className="text-slate-600 text-xs mt-1">Select or connect an org from the sidebar to use DataForge.</p>
        </div>
      </div>
    )
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-indigo-400" />
          <h2 className="text-2xl font-bold text-white">DataForge</h2>
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">
            CSV Import
          </span>
        </div>
        {step > 1 && (
          <button
            onClick={resetWizard}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Start Over
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator current={step} />

      {/* -------------------------------------------------------------------- */}
      {/* Step 1 — Upload                                                        */}
      {/* -------------------------------------------------------------------- */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white">Upload CSV & Configure</h3>

            <FileUploader onFileLoaded={(fileData) => {
              setCsvData(fileData)
              if (fileData.suggestedObject) setObjectName(fileData.suggestedObject)
            }} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Salesforce Object <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={objectName}
                  onChange={(e) => setObjectName(e.target.value)}
                  placeholder="e.g. Account, Contact, Lead"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Operation</label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {OPERATIONS.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </div>
            </div>

            {operation === 'UPSERT' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  External ID Field <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={externalIdField}
                  onChange={(e) => setExternalIdField(e.target.value)}
                  placeholder="e.g. Id, ExternalId__c"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Field used to match existing records. Use <span className="text-slate-400 font-mono">Id</span> to match by Salesforce ID, or a custom external ID field like <span className="text-slate-400 font-mono">ExternalId__c</span>.
                </p>
              </div>
            )}
          </div>

          {fieldsError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{fieldsError}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={goToStep2}
              disabled={!csvData || !objectName.trim() || fieldsLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                !csvData || !objectName.trim() || fieldsLoading
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {fieldsLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading Fields...
                </>
              ) : (
                <>
                  Next: Map Fields
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Step 2 — Map Fields                                                    */}
      {/* -------------------------------------------------------------------- */}
      {step === 2 && (
        <div className="space-y-5">
          <FieldMapper
            csvHeaders={csvData?.headers ?? []}
            sfFields={sfFields}
            onMappingChange={handleMappingChange}
          />

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(1)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={goToStep3}
              disabled={mappedCount === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mappedCount === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              Next: Review
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Step 3 — Review & Import                                               */}
      {/* -------------------------------------------------------------------- */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Review Import</h3>
              <div className="text-xs text-slate-500 space-x-3">
                <span className="bg-slate-700 px-2 py-0.5 rounded">{objectName}</span>
                <span className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-2 py-0.5 rounded">
                  {operation}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-slate-700">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{csvData?.rows?.length?.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-0.5">Total Rows</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-400">{mappedCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Fields Mapped</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-300">
                  {csvData?.headers?.length - mappedCount}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Columns Skipped</p>
              </div>
            </div>

            {/* Preview first 5 rows */}
            <div className="p-6">
              <p className="text-xs font-medium text-slate-400 mb-3">
                Preview — first {Math.min(5, csvData?.rows?.length ?? 0)} rows
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-700/50">
                    <tr>
                      {Object.entries(mapping)
                        .filter(([, sf]) => sf)
                        .map(([csv, sf]) => (
                          <th key={csv} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">
                            {sf}
                            <span className="text-slate-600 ml-1">({csv})</span>
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {csvData?.rows?.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-700/20">
                        {Object.entries(mapping)
                          .filter(([, sf]) => sf)
                          .map(([csv]) => (
                            <td key={csv} className="px-3 py-2 text-slate-300 max-w-[150px] truncate" title={row[csv]}>
                              {row[csv] || <span className="text-slate-600">empty</span>}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {importError && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{importError}</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={() => setStep(2)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Back
            </button>
            <button
              onClick={startImport}
              disabled={importLoading}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                importLoading
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {importLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Starting Import...
                </>
              ) : (
                <>
                  Start Import
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Step 4 — Progress                                                      */}
      {/* -------------------------------------------------------------------- */}
      {step === 4 && (
        <div className="space-y-5">
          <ImportProgress job={activeJob} onRefresh={refreshActiveJob} />

          {(activeJob?.status === 'COMPLETED' ||
            activeJob?.status === 'COMPLETED_WITH_ERRORS' ||
            activeJob?.status === 'FAILED') && (
            <div className="flex justify-end">
              <button
                onClick={resetWizard}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New Import
              </button>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Import History                                                          */}
      {/* -------------------------------------------------------------------- */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">Import History</h3>
          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <ImportHistory jobs={jobs} onSelect={handleSelectHistoryJob} />
      </div>
    </div>
  )
}
