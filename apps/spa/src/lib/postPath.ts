export function buildPostPath(slug: string, categorySlugPath?: string | null) {
    const normalized = categorySlugPath?.replace(/^\/+|\/+$/g, '')
    return normalized ? `/post/${normalized}/${slug}` : `/post/${slug}`
}
