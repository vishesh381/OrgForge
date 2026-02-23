import apiClient from '../../../core/services/apiClient.js'

export const getLimits = (orgId) =>
  apiClient.get('/limit-guard', { params: { orgId } }).then(r => r.data)

export const getHistory = (orgId, limitName, days = 7) =>
  apiClient.get('/limit-guard/history', { params: { orgId, limitName, days } }).then(r => r.data)

export const getAlerts = (orgId) =>
  apiClient.get('/limit-guard/alerts', { params: { orgId } }).then(r => r.data)

export const saveAlert = (orgId, data) =>
  apiClient.post('/limit-guard/alerts', data, { params: { orgId } }).then(r => r.data)
