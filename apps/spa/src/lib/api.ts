import axios, { type AxiosRequestHeaders } from 'axios'
import { useAuthStore } from '../store/useAuthStore'
import type { SiteConfig } from '../config/siteConfig'
import type { AdminProfileResponse, AdminSiteConfigResponse, UpdatePasswordRequest } from '../types/api'

export interface ApiResponse<T> {
    result: 'success' | 'error'
    message: string
    data: T
}

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const API_BASE_URL = envApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')
export const API_HOST = API_BASE_URL.replace(/\/api$/, '')
export const REQUEST_TIMEOUT = {
    default: 15_000,
    notionImport: 120_000,
    upload: 180_000,
} as const

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: REQUEST_TIMEOUT.default,
})

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token
    if (token) {
        const headers: AxiosRequestHeaders = (config.headers as AxiosRequestHeaders) ?? {}
        headers.Authorization = `Bearer ${token}`
        config.headers = headers
    }
    return config
})

export function unwrapResponse<T>(response: ApiResponse<T>): T {
    if (response.result !== 'success') {
        throw new Error(response.message || '接口返回异常')
    }
    return response.data
}

export async function getAdminProfile(): Promise<AdminProfileResponse> {
    const res = await api.get<ApiResponse<AdminProfileResponse>>('/admin/settings/profile')
    return unwrapResponse(res.data)
}

export async function getAdminSiteConfig(): Promise<AdminSiteConfigResponse> {
    const res = await api.get<ApiResponse<AdminSiteConfigResponse>>('/admin/settings/site-config')
    return unwrapResponse(res.data)
}

export async function updateAdminSiteConfig(config: SiteConfig): Promise<AdminSiteConfigResponse> {
    const res = await api.put<ApiResponse<AdminSiteConfigResponse>>('/admin/settings/site-config', config)
    return unwrapResponse(res.data)
}

export async function updateAdminPassword(payload: UpdatePasswordRequest): Promise<void> {
    const res = await api.put<ApiResponse<void>>('/admin/settings/password', payload)
    return unwrapResponse(res.data)
}
