import axios from 'axios'
import { useAuthStore } from '../store/appStore.js'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
