import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { FolderTree, Plus, Trash2 } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Category } from '../../types/api'

type CategoryTree = Category & { children?: CategoryTree[] }

export default function CategoryManagerPage() {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [parentId, setParentId] = useState<number | ''>('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<CategoryTree[]>>('/categories')
            return unwrapResponse(res.data)
        },
    })

    const createMutation = useMutation({
        mutationFn: async (payload: { name: string; description?: string; parentId?: number | null }) => {
            const res = await api.post<ApiResponse<Category>>('/categories', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setName('')
            setDescription('')
            setErrorMsg(null)
            categoriesQuery.refetch()
        },
        onError: (err: any) => {
            const message = err?.response?.data?.message || err?.message || '创建分类失败'
            setErrorMsg(message)
            alert(message)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/categories/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => categoriesQuery.refetch(),
        onError: (err: any) => {
            const msg = err?.response?.data?.message || '删除失败，请先删除子分类或调整关联文章'
            alert(msg)
        },
    })

    const tree = categoriesQuery.data ?? []
    const flatOptions = useMemo(() => flattenCategories(tree), [tree])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        createMutation.mutate({
            name: name.trim(),
            description: description.trim() || undefined,
            parentId: parentId === '' ? null : Number(parentId),
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">分类管理</h1>
                <p className="text-muted-foreground">支持层级分类，路径按层级生成，可用 “/” 递归创建。</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_360px]">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <FolderTree className="h-4 w-4" />
                            分类树
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => categoriesQuery.refetch()}>
                            刷新
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {categoriesQuery.isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                        {!categoriesQuery.isLoading && (
                            <div className="space-y-2">
                                {tree.length ? (
                                    tree.map((cat) => (
                                        <CategoryNode
                                            key={cat.id}
                                            node={cat}
                                            depth={0}
                                            onCreateChild={(id) => setParentId(id)}
                                            onDelete={(id) => {
                                                if (confirm('确认删除该分类？请先删除子分类并确保无文章关联。')) {
                                                    deleteMutation.mutate(id)
                                                }
                                            }}
                                        />
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">暂无分类</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>新建分类</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">名称</label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="如：后端 / 前端 / 架构 或 后端/Java/框架"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">父级</label>
                                <select
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    value={parentId}
                                    onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}
                                >
                                    <option value="">无（顶级）</option>
                                    {flatOptions.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.prefix}
                                            {opt.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    路径按层级生成，例如 backend/java → backend/java/spring。
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">描述（可选）</label>
                                <textarea
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="一句话描述该分类的用途"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending ? '创建中...' : '创建分类'}
                            </Button>
                            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function CategoryNode({
    node,
    depth,
    onCreateChild,
    onDelete,
}: {
    node: CategoryTree
    depth: number
    onCreateChild: (id: number) => void
    onDelete: (id: number) => void
}) {
    return (
        <div className="rounded-md border border-slate-200 px-3 py-2 bg-white">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                            {`${'|--'.repeat(depth)} ${node.name}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{node.slugPath}</span>
                    </div>
                    {node.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{node.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => onCreateChild(node.id!)}>
                        <Plus className="h-3.5 w-3.5" />
                        子类
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-500 hover:text-red-600"
                        onClick={() => onDelete(node.id!)}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            {node.children && node.children.length > 0 && (
                <div className="mt-2 space-y-2 pl-4 border-l border-slate-200">
                    {node.children.map((child) => (
                        <CategoryNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            onCreateChild={onCreateChild}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function flattenCategories(tree: CategoryTree[], depth = 0): { id: number; name: string; prefix: string }[] {
    const result: { id: number; name: string; prefix: string }[] = []
    tree.forEach((cat) => {
        result.push({ id: cat.id, name: cat.name, prefix: `${'|--'.repeat(depth)}${depth ? ' ' : ''}` })
        if (cat.children?.length) {
            result.push(...flattenCategories(cat.children, depth + 1))
        }
    })
    return result
}
