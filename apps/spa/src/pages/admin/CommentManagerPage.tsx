import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { MessageSquare, CheckCircle2, Clock, Trash2, RefreshCw } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Comment, PageResult } from '../../types/api'

export default function CommentManagerPage() {
    const [statusFilter, setStatusFilter] = useState<string>('')

    const commentsQuery = useQuery({
        queryKey: ['admin-comments', statusFilter],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<Comment>>>('/admin/comments', {
                params: {
                    status: statusFilter || undefined,
                    page: 0,
                    size: 50,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const approveMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.post<ApiResponse<void>>(`/comments/${id}/approve`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => commentsQuery.refetch(),
        onError: () => alert('审核评论失败，请稍后重试'),
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/comments/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => commentsQuery.refetch(),
        onError: () => alert('删除评论失败，请稍后重试'),
    })

    const comments = commentsQuery.data?.content ?? []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">评论管理</h1>
                    <p className="text-muted-foreground">审阅、通过或删除文章评论。</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => commentsQuery.refetch()}
                    disabled={commentsQuery.isLoading}
                >
                    <RefreshCw className="h-4 w-4" />
                    刷新
                </Button>
            </div>

            <Card className="border border-slate-200 shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <CardTitle>评论列表</CardTitle>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">状态筛选</span>
                        <select
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">全部</option>
                            <option value="PENDING">待审核</option>
                            <option value="APPROVED">已通过</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {commentsQuery.isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                    {!commentsQuery.isLoading && (
                        <div className="flex flex-col gap-3">
                            {comments.map((comment) => (
                                <div
                                    key={comment.id}
                                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100">
                                                <MessageSquare className="h-4 w-4 text-slate-700" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-800 line-clamp-2 break-words">
                                                    {comment.content}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                                    {comment.articleTitle || '未知文章'} ·{' '}
                                                    {comment.articleSlug ? `/post/${comment.articleSlug}` : '无 slug'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={comment.status === 'APPROVED' ? 'default' : 'secondary'}
                                            className="shrink-0"
                                        >
                                            {comment.status === 'APPROVED' ? '已通过' : '待审核'}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="font-medium text-slate-700">{comment.authorName}</span>
                                            {comment.createdAt && (
                                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                                            )}
                                            {comment.status === 'PENDING' ? (
                                                <span className="inline-flex items-center gap-1 text-amber-600">
                                                    <Clock className="h-3.5 w-3.5" /> 待审核
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                    <CheckCircle2 className="h-3.5 w-3.5" /> 已通过
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {comment.status !== 'APPROVED' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => approveMutation.mutate(comment.id)}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    通过
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => {
                                                    if (confirm('确认删除这条评论？')) {
                                                        deleteMutation.mutate(comment.id)
                                                    }
                                                }}
                                                disabled={deleteMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {!comments.length && <p className="text-sm text-muted-foreground">暂无评论</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
