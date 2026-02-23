import apiClient from '../../../core/services/apiClient.js'

const BASE = '/permission-pilot'

export const getProfiles = (orgId) =>
  apiClient.get(`${BASE}/profiles`, { params: { orgId } }).then((r) => r.data)

export const snapshotProfile = (orgId, profileId, profileName) =>
  apiClient
    .post(`${BASE}/snapshot`, null, { params: { orgId, profileId, profileName } })
    .then((r) => r.data)

export const getComparisons = (orgId) =>
  apiClient.get(`${BASE}/comparisons`, { params: { orgId } }).then((r) => r.data)

export const compareProfiles = (orgId, profileA, profileB, comparedBy = 'user') =>
  apiClient
    .post(`${BASE}/compare`, null, { params: { orgId, profileA, profileB, comparedBy } })
    .then((r) => r.data)

export const getViolations = (orgId) =>
  apiClient.get(`${BASE}/violations`, { params: { orgId } }).then((r) => r.data)

export const detectViolations = (orgId) =>
  apiClient.post(`${BASE}/detect-violations`, null, { params: { orgId } }).then((r) => r.data)

export const acknowledgeViolation = (id) =>
  apiClient.post(`${BASE}/violations/${id}/acknowledge`).then((r) => r.data)
