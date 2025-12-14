import axios, { type AxiosRequestHeaders } from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export interface ApiResponse<T> {
    result: 'success' | 'error';
    message: string;
    data: T;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        const headers: AxiosRequestHeaders = (config.headers as AxiosRequestHeaders) ?? {};
        headers.Authorization = `Bearer ${token}`;
        config.headers = headers;
    }
    return config;
});

export function unwrapResponse<T>(response: ApiResponse<T>): T {
    if (response.result !== 'success') {
        throw new Error(response.message || '接口返回异常');
    }
    return response.data;
}
