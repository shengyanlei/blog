import type { Category } from '../types/api'
import { slugify } from './slug'

export interface FlatCategory {
    id: number
    name: string
    path: string
    prefix: string
    parentId?: number | null
}

const normalizeSlugPath = (slugPath?: string) => {
    if (!slugPath) return undefined
    return `/${slugPath.replace(/^\/+/, '')}`
}

export function flattenCategoryTree(
    tree: Category[] = [],
    depth = 0,
    parentPath = ''
): FlatCategory[] {
    const result: FlatCategory[] = []

    for (const category of tree) {
        const normalizedPath = normalizeSlugPath(category.slugPath)
        const segment = slugify(category.slugPath?.split('/').pop() ?? category.name, 'category')
        const path = normalizedPath ?? (parentPath ? `${parentPath}/${segment}` : `/${segment}`)

        result.push({
            id: category.id,
            name: category.name,
            path,
            prefix: depth > 0 ? `${'|--'.repeat(depth)} ` : '',
            parentId: category.parentId ?? null,
        })

        if (category.children?.length) {
            result.push(...flattenCategoryTree(category.children, depth + 1, path))
        }
    }

    return result
}
