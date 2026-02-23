import apiClient from '../../../core/services/apiClient.js'

/**
 * Fetch all describe fields for a given SF object.
 * @param {string} orgId
 * @param {string} objectName
 */
export function getObjectFields(orgId, objectName) {
  return apiClient.get(`/data-forge/objects/${encodeURIComponent(objectName)}/fields?orgId=${orgId}`)
}

/**
 * List import jobs (paginated).
 * @param {string} orgId
 * @param {number} page  zero-based
 */
export function getJobs(orgId, page = 0) {
  return apiClient.get(`/data-forge/jobs?orgId=${orgId}&page=${page}`)
}

/**
 * Fetch a single import job with its errors.
 * @param {number|string} id
 */
export function getJob(id) {
  return apiClient.get(`/data-forge/jobs/${id}`)
}

/**
 * Create and start an import job.
 * @param {{ orgId: string, objectName: string, operation: string, fileName: string, records: object[], createdBy: string }} payload
 */
export function createJob(payload) {
  return apiClient.post('/data-forge/jobs', payload)
}

/**
 * List saved field mappings for a given org + object.
 * @param {string} orgId
 * @param {string} objectName
 */
export function getMappings(orgId, objectName) {
  return apiClient.get(
    `/data-forge/mappings?orgId=${orgId}&objectName=${encodeURIComponent(objectName)}`
  )
}

/**
 * Create or update a field mapping.
 * @param {{ orgId: string, objectName: string, mappingName: string, mappingJson: string, createdBy: string }} payload
 */
export function saveMapping(payload) {
  return apiClient.post('/data-forge/mappings', payload)
}
