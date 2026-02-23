import apiClient from '../../../core/services/apiClient.js'

export function getClasses(orgId) {
  return apiClient.get(`/apex-pulse/classes?orgId=${orgId}`)
}

export function runTests(orgId, classIds) {
  return apiClient.post(`/apex-pulse/run?orgId=${orgId}`, { classIds })
}

export function getRuns(orgId, page = 0, size = 15) {
  return apiClient.get(`/apex-pulse/history/runs?orgId=${orgId}&page=${page}&size=${size}`)
}

export function getRunDetail(orgId, runId) {
  return apiClient.get(`/apex-pulse/history/runs/${runId}?orgId=${orgId}`)
}

export function getOrgStats(orgId) {
  return apiClient.get(`/apex-pulse/org-stats?orgId=${orgId}`)
}

export function getPassRateTrend(orgId, days = 30) {
  return apiClient.get(`/apex-pulse/history/trends/pass-rate?orgId=${orgId}&days=${days}`)
}

export function getCoverageTrend(orgId, days = 30) {
  return apiClient.get(`/apex-pulse/history/trends/coverage?orgId=${orgId}&days=${days}`)
}
