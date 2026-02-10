import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Folder } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Category } from '../../types/api'

export default function CategoryManagerPage() {
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<Category[]>>('/categories')
            return unwrapResponse(res.data)
        },
    })

    const createMutation = useMutation({
        mutationFn: async (payload: { name: string; slug: string }) => {
            const res = await api.post<ApiResponse<Category>>('/categories', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setName('')
            setSlug('')
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
        onError: () => alert('删除分类失败，请稍后重试'),
    })

    const categories = categoriesQuery.data ?? []

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        createMutation.mutate({ name: name.trim(), slug: slug.trim() })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold font-display mb-2 text-[color:var(--ink)]">分类管理</h1>
                <p className="text-[color:var(--ink-muted)]">创建、查看与删除文章分类。</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_360px]">
                <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                    <CardHeader>
                        <CardTitle className="text-[color:var(--ink)]">分类列表</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {categoriesQuery.isLoading && <p className="text-sm text-[color:var(--ink-soft)]">加载中...</p>}
                        {!categoriesQuery.isLoading && (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className="flex items-center justify-between rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="h-8 w-8 rounded-full bg-[color:var(--paper-strong)] flex items-center justify-center">
                                                <Folder className="h-4 w-4 text-[color:var(--ink-soft)]" />
                                            </span>
                                            <span className="truncate font-medium text-[color:var(--ink)]">{category.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-[#b91c1c] hover:text-[#991b1b]"
                                            onClick={() => deleteMutation.mutate(category.id)}
                                        >
                                            删除
                                        </Button>
                                    </div>
                                ))}
                                {!categories.length && (
                                    <div className="col-span-full text-sm text-[color:var(--ink-soft)]">暂无分类</div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                    <CardHeader>
                        <CardTitle className="text-[color:var(--ink)]">新建分类</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-sm text-[color:var(--ink-muted)]">分类名称</label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例如：工程实践"
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm text-[color:var(--ink-muted)]">路径标识</label>
                                <Input
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    placeholder="例如：engineering"
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)]"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-[color:var(--accent)] hover:bg-[#92400e] text-white"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? '创建中...' : '创建分类'}
                            </Button>
                            {errorMsg && <p className="text-xs text-[#b91c1c]">{errorMsg}</p>}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
