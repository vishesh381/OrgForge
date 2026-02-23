import apiClient from '../../../core/services/apiClient.js'

export function getDashboardStats(orgId) {
  return apiClient.get(`/flow-forge?orgId=${orgId}`)
}

export function getFlowRuns(orgId, status = '', page = 0) {
  const params = new URLSearchParams({ orgId, page })
  if (status && status !== 'All') params.set('status', status)
  return apiClient.get(`/flow-forge/runs?${params.toString()}`)
}

export function getFlowRunDetail(id) {
  return apiClient.get(`/flow-forge/runs/${id}`)
}

export function detectOverlaps(orgId) {
  return apiClient.post(`/flow-forge/detect-overlaps?orgId=${orgId}`)
}

export function getOverlaps(orgId) {
  return apiClient.get(`/flow-forge/overlaps?orgId=${orgId}`)
}

export function getFlowAnalytics(orgId, days = 30) {
  return apiClient.get(`/flow-forge/analytics?orgId=${orgId}&days=${days}`)
}

export function getFlows(orgId) {
  return apiClient.get(`/flow-forge/flows?orgId=${orgId}`)
}

export function getFlowInputs(orgId, apiName) {
  return apiClient.get(`/flow-forge/flows/inputs?orgId=${orgId}&apiName=${encodeURIComponent(apiName)}`)
}

export function invokeFlow(orgId, apiName, label, inputs = {}) {
  return apiClient.post(`/flow-forge/flows/invoke?orgId=${orgId}`, { apiName, label, inputs })
}

export function lookupRecords(orgId, sobjectType, q) {
  return apiClient.get(`/flow-forge/flows/lookup?orgId=${orgId}&sobjectType=${encodeURIComponent(sobjectType)}&q=${encodeURIComponent(q)}`)
}
