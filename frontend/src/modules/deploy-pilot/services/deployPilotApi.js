import apiClient from '../../../core/services/apiClient.js'

export function getDeployments(orgId, page = 0) {
  return apiClient.get(`/deploy-pilot?orgId=${orgId}&page=${page}`)
}

export function getDeployment(orgId, id) {
  return apiClient.get(`/deploy-pilot/${id}?orgId=${orgId}`)
}

export function syncDeployments(orgId) {
  return apiClient.post(`/deploy-pilot/sync?orgId=${orgId}`)
}

export function analyzeImpact(orgId, components) {
  return apiClient.post(`/deploy-pilot/analyze-impact?orgId=${orgId}`, { components })
}

export function startDeployment(orgId, label, validationOnly = false, deployedBy = '') {
  return apiClient.post(`/deploy-pilot?orgId=${orgId}`, { label, validationOnly, deployedBy })
}

export function rollbackDeployment(orgId, id, reason, rolledBackBy = '') {
  return apiClient.post(`/deploy-pilot/${id}/rollback?orgId=${orgId}`, { reason, rolledBackBy })
}
