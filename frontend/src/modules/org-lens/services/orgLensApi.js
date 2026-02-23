import apiClient from '../../../core/services/apiClient.js'

export const getOrgHealth = (orgId) =>
  apiClient.get('/org-lens/health', { params: { orgId } }).then((r) => r.data)

export const getHealthHistory = (orgId) =>
  apiClient.get('/org-lens/health/history', { params: { orgId } }).then((r) => r.data)

export const getDeadCode = (orgId) =>
  apiClient.get('/org-lens/dead-code', { params: { orgId } }).then((r) => r.data)

export const markReviewed = (orgId, id, reviewedBy) =>
  apiClient
    .post(`/org-lens/dead-code/${id}/review`, { reviewedBy }, { params: { orgId } })
    .then((r) => r.data)

export const getDependencies = (orgId) =>
  apiClient.get('/org-lens/dependencies', { params: { orgId } }).then((r) => r.data)
