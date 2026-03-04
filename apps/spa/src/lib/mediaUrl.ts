import { API_HOST } from './api'

const ABSOLUTE_URL_PATTERN = /^(?:https?:)?\/\//i

/**
 * Resolve media path returned by backend to a browser-usable URL.
 * Backend often returns relative paths like "/uploads/xxx".
 */
export function resolveMediaUrl(url?: string | null): string | undefined {
    if (!url) return undefined
    const normalized = url.trim()
    if (!normalized) return undefined
    if (ABSOLUTE_URL_PATTERN.test(normalized) || normalized.startsWith('data:') || normalized.startsWith('blob:')) {
        return normalized
    }
    if (normalized.startsWith('/')) {
        return `${API_HOST}${normalized}`
    }
    return `${API_HOST}/${normalized}`
}
