import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Tag } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Tag as TagDto } from '../../types/api'

export default function TagManagerPage() {
    const [name, setName] = useState('')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const tagsQuery = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<TagDto[]>>('/tags')
            return unwrapResponse(res.data)
        },
    })

    const createMutation = useMutation({
        mutationFn: async (payload: { name: string }) => {
            const res = await api.post<ApiResponse<TagDto>>('/tags', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setName('')
            setErrorMsg(null)
            tagsQuery.refetch()
        },
        onError: (err: any) => {
            const message = err?.response?.data?.message || err?.message || '创建标签失败'
            setErrorMsg(message)
            alert(message)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/tags/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => tagsQuery.refetch(),
        onError: () => alert('删除标签失败，请稍后重试'),
    })

    const tags = tagsQuery.data ?? []

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return
        createMutation.mutate({ name: name.trim() })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">标签管理</h1>
                <p className="text-muted-foreground">创建、查看、删除标签，方便文章归档和检索。</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_360px]">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>标签列表</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tagsQuery.isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                        {!tagsQuery.isLoading && (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {tags.map((tag) => (
                                    <div
                                        key={tag.id}
                                        className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Tag className="h-4 w-4 text-slate-600" />
                                            </span>
                                            <span className="truncate font-medium text-slate-800">{tag.name}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-red-500 hover:text-red-600"
                                            onClick={() => deleteMutation.mutate(tag.id)}
                                        >
                                            删除
                                        </Button>
                                    </div>
                                ))}
                                {!tags.length && <div className="col-span-full text-sm text-muted-foreground">暂无标签</div>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>新建标签</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-sm text-muted-foreground">标签名称</label>
                                <Input
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例如：后端、前端、架构"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                                {createMutation.isPending ? '创建中...' : '创建标签'}
                            </Button>
                            {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
