import type { AuthUser } from '../types/api'

export const ADMIN_TAB_CODES = {
    DASHBOARD: 'DASHBOARD',
    ARTICLES: 'ARTICLES',
    WRITE: 'WRITE',
    UPLOAD: 'UPLOAD',
    COMMENTS: 'COMMENTS',
    TAGS: 'TAGS',
    CATEGORIES: 'CATEGORIES',
    FOOTPRINTS: 'FOOTPRINTS',
    MATERIALS: 'MATERIALS',
    COVER_MATERIALS: 'COVER_MATERIALS',
    SETTINGS: 'SETTINGS',
    ACCOUNTS: 'ACCOUNTS',
} as const

export type AdminTabCode = (typeof ADMIN_TAB_CODES)[keyof typeof ADMIN_TAB_CODES]

export const OWNER_TAB_CODES: AdminTabCode[] = [
    ADMIN_TAB_CODES.DASHBOARD,
    ADMIN_TAB_CODES.ARTICLES,
    ADMIN_TAB_CODES.WRITE,
    ADMIN_TAB_CODES.UPLOAD,
    ADMIN_TAB_CODES.COMMENTS,
    ADMIN_TAB_CODES.TAGS,
    ADMIN_TAB_CODES.CATEGORIES,
    ADMIN_TAB_CODES.FOOTPRINTS,
    ADMIN_TAB_CODES.MATERIALS,
    ADMIN_TAB_CODES.COVER_MATERIALS,
    ADMIN_TAB_CODES.SETTINGS,
    ADMIN_TAB_CODES.ACCOUNTS,
]

export const ADMIN_TAB_ROUTE_MAP: Record<AdminTabCode, string> = {
    [ADMIN_TAB_CODES.DASHBOARD]: '/admin/dashboard',
    [ADMIN_TAB_CODES.ARTICLES]: '/admin/articles',
    [ADMIN_TAB_CODES.WRITE]: '/admin/write',
    [ADMIN_TAB_CODES.UPLOAD]: '/admin/upload',
    [ADMIN_TAB_CODES.COMMENTS]: '/admin/comments',
    [ADMIN_TAB_CODES.TAGS]: '/admin/tags',
    [ADMIN_TAB_CODES.CATEGORIES]: '/admin/categories',
    [ADMIN_TAB_CODES.FOOTPRINTS]: '/admin/footprints',
    [ADMIN_TAB_CODES.MATERIALS]: '/admin/materials',
    [ADMIN_TAB_CODES.COVER_MATERIALS]: '/admin/cover-materials',
    [ADMIN_TAB_CODES.SETTINGS]: '/admin/settings',
    [ADMIN_TAB_CODES.ACCOUNTS]: '/admin/accounts',
}

export function isOwnerUser(user: AuthUser | null | undefined): boolean {
    if (!user) return false
    const role = (user.role || '').toUpperCase()
    return role === 'OWNER' || role === 'ADMIN'
}

export function resolveUserTabs(user: AuthUser | null | undefined): AdminTabCode[] {
    if (!user) return []
    if (isOwnerUser(user)) return OWNER_TAB_CODES
    const source = Array.isArray(user.tabCodes) ? user.tabCodes : []
    const normalized = source
        .map((item) => String(item).trim().toUpperCase())
        .filter((item): item is AdminTabCode => item in ADMIN_TAB_ROUTE_MAP)
    return Array.from(new Set(normalized))
}

export function firstAccessibleAdminPath(user: AuthUser | null | undefined): string | null {
    const tabs = resolveUserTabs(user)
    if (!tabs.length) return null
    return ADMIN_TAB_ROUTE_MAP[tabs[0]]
}

export function canAccessAdminPath(user: AuthUser | null | undefined, pathname: string): boolean {
    const tabs = resolveUserTabs(user)
    const allowedPaths = tabs.map((tab) => ADMIN_TAB_ROUTE_MAP[tab])
    return allowedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}
