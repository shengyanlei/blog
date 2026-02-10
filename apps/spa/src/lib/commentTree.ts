export type TreeNodeShape = {
    id: number
    parentId?: number | null
    createdAt?: string
}

export type CommentTreeNode<T extends TreeNodeShape> = T & {
    children: CommentTreeNode<T>[]
}

const toTimestamp = (value?: string) => {
    if (!value) return 0
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
}

export function buildCommentTree<T extends TreeNodeShape>(
    items: T[],
    rootOrder: 'asc' | 'desc' = 'desc'
): CommentTreeNode<T>[] {
    const nodeMap = new Map<number, CommentTreeNode<T>>()
    for (const item of items) {
        nodeMap.set(item.id, { ...item, children: [] })
    }

    const roots: CommentTreeNode<T>[] = []
    for (const node of nodeMap.values()) {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)?.children.push(node)
        } else {
            roots.push(node)
        }
    }

    const sortChildrenAsc = (nodes: CommentTreeNode<T>[]) => {
        nodes.sort((a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt))
        for (const node of nodes) {
            sortChildrenAsc(node.children)
        }
    }

    roots.sort((a, b) => {
        const diff = toTimestamp(a.createdAt) - toTimestamp(b.createdAt)
        return rootOrder === 'desc' ? -diff : diff
    })
    for (const root of roots) {
        sortChildrenAsc(root.children)
    }

    return roots
}
