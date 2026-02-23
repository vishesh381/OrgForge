import { useState, useCallback } from 'react'
import apiClient from '../services/apiClient.js'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (method, url, data = null, config = {}) => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient({ method, url, data, ...config })
      return res.data
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Request failed'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const get  = useCallback((url, cfg)       => execute('GET',    url, null, cfg), [execute])
  const post = useCallback((url, data, cfg) => execute('POST',   url, data, cfg), [execute])
  const put  = useCallback((url, data, cfg) => execute('PUT',    url, data, cfg), [execute])
  const del  = useCallback((url, cfg)       => execute('DELETE', url, null, cfg), [execute])

  return { loading, error, get, post, put, del, execute }
}
