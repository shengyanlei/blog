import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Clock, Trash2, RefreshCw } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Comment, PageResult } from '../../types/api'
import { buildCommentTree, type CommentTreeNode } from '../../lib/commentTree'

const buildAvatarUrl = (seed: string | number | undefined) =>
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(String(seed || 'guest'))}`

type CommentNode = CommentTreeNode<Comment>

export default function CommentManagerPage() {
    const commentsQuery = useQuery({
        queryKey: ['admin-comments'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<Comment>>>('/admin/comments', {
                params: {
                    page: 0,
                    size: 50,
                },
            })
            return unwrapResponse(res.data)
        },
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
    const commentTree = useMemo(() => buildCommentTree(comments), [comments])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold font-display mb-2 text-[color:var(--ink)]">评论管理</h1>
                    <p className="text-[color:var(--ink-muted)]">查看并整理评论，必要时可以直接删除。</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)]"
                    onClick={() => commentsQuery.refetch()}
                >
                    <RefreshCw className="h-4 w-4" />
                    刷新
                </Button>
            </div>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                <CardHeader>
                    <CardTitle className="text-[color:var(--ink)]">评论列表</CardTitle>
                </CardHeader>
                <CardContent>
                    {commentsQuery.isLoading && <p className="text-sm text-[color:var(--ink-soft)]">加载中...</p>}
                    {!commentsQuery.isLoading && (
                        <div className="space-y-4">
                            {commentTree.map((comment) => (
                                <CommentItem key={comment.id} node={comment} onDelete={(id) => deleteMutation.mutate(id)} />
                            ))}
                            {!commentTree.length && (
                                <p className="text-sm text-[color:var(--ink-soft)]">暂无评论</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function CommentItem({ node, onDelete, depth = 0 }: { node: CommentNode; onDelete: (id: number) => void; depth?: number }) {
    return (
        <div className="space-y-3">
            <div className="flex gap-3">
                <img
                    src={buildAvatarUrl(node.authorName)}
                    alt={node.authorName || '匿名用户'}
                    className="h-9 w-9 rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper)]"
                />
                <div className="flex-1 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-[color:var(--ink)]">
                                {node.authorName || '匿名用户'}
                            </div>
                            <div className="text-xs text-[color:var(--ink-soft)] flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {node.createdAt ? new Date(node.createdAt).toLocaleString() : '未知时间'}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#b91c1c] hover:text-[#991b1b]"
                            onClick={() => onDelete(node.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--ink-muted)] leading-relaxed">{node.content}</p>
                </div>
            </div>

            {node.children.length > 0 && (
                <div className="space-y-3 pl-10 border-l border-[color:var(--card-border)]">
                    {node.children.map((child) => (
                        <CommentItem key={child.id} node={child} onDelete={onDelete} depth={depth + 1} />
                    ))}
                </div>
            )}
        </div>
    )
}

