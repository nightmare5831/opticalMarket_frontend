import axios, { AxiosRequestConfig } from 'axios'

const Axios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://opticalmarket-backend-6pfl.onrender.com/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Debug interceptors
Axios.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
  return config
}, (error) => {
  console.error('[API] Request error:', error)
  return Promise.reject(error)
})

Axios.interceptors.response.use((response) => {
  console.log(`[API] ${response.status} ${response.config.url}`)
  return response
}, (error) => {
  console.error(`[API] Response error: ${error.response?.status || 'NO_RESPONSE'} ${error.config?.url}`, error.message)
  return Promise.reject(error)
})

const getHeaders = () => {
  if (typeof window !== 'undefined') {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      const { state } = JSON.parse(authData)
      if (state?.token) {
        return { Authorization: `Bearer ${state.token}` }
      }
    }
  }
  return {}
}

const Request = {
  Get: async (url: string, options?: AxiosRequestConfig) => {
    return await Axios.get(url, { ...options, headers: { ...getHeaders(), ...options?.headers } }).then((res) => res.data)
  },
  Post: async (url: string, body?: any, options?: AxiosRequestConfig) => {
    return await Axios.post(url, body, { ...options, headers: { ...getHeaders(), ...options?.headers } }).then((res) => res.data)
  },
  Put: async (url: string, body: any) => {
    return await Axios.put(url, body, { headers: getHeaders() }).then((res) => res.data)
  },
  Patch: async (url: string, body: any) => {
    return await Axios.patch(url, body, { headers: getHeaders() }).then((res) => res.data)
  },
  Delete: async (url: string, body?: any) => {
    return await Axios.delete(url, { data: body, headers: getHeaders() }).then((res) => res.data)
  },
}

export default Request
