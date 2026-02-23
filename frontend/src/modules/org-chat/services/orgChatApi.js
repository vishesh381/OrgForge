import apiClient from '../../../core/services/apiClient.js'

export const getSessions = (orgId) =>
  apiClient.get('/org-chat/sessions', { params: { orgId } }).then(r => r.data)

export const createSession = (orgId, userId) =>
  apiClient.post('/org-chat/sessions', null, { params: { orgId, userId } }).then(r => r.data)

export const deleteSession = (id) =>
  apiClient.delete(`/org-chat/sessions/${id}`).then(r => r.data)

export const getMessages = (sessionId) =>
  apiClient.get(`/org-chat/sessions/${sessionId}/messages`).then(r => r.data)

export const sendMessage = (sessionId, orgId, content) =>
  apiClient.post(`/org-chat/sessions/${sessionId}/messages`, { content }, { params: { orgId } }).then(r => r.data)
