const CLEAN_PATTERN = /[^a-z0-9\u4e00-\u9fa5\s-]/g

export function slugify(input?: string | null, fallback = 'untitled') {
    if (!input) return fallback

    const cleaned = input
        .trim()
        .toLowerCase()
        .replace(CLEAN_PATTERN, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    return cleaned || fallback
}
