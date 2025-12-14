import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Clock, Trash2, RefreshCw } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Comment, PageResult } from '../../types/api'

const buildAvatarUrl = (seed: string | number | undefined) =>
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(String(seed || 'guest'))}`

type CommentNode = Comment & { children: CommentNode[] }

const buildCommentTree = (items: Comment[]): CommentNode[] => {
    const map = new Map<number, CommentNode>()
    items.forEach((c) => {
        map.set(c.id, { ...c, children: [] })
    })

    const roots: CommentNode[] = []
    map.forEach((node) => {
        if (node.parentId && map.has(node.parentId)) {
            map.get(node.parentId)?.children.push(node)
        } else {
            roots.push(node)
        }
    })

    const sortNodes = (list: CommentNode[], order: 'asc' | 'desc') => {
        list.sort((a, b) => {
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return order === 'desc' ? bt - at : at - bt
        })
        list.forEach((n) => sortNodes(n.children, 'asc'))
    }

    sortNodes(roots, 'desc')
    return roots
}

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
                    <h1 className="text-3xl font-bold mb-2">评论管理</h1>
                    <p className="text-muted-foreground">查看、整理评论，发现不合规内容可以直接删除。</p>
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
                    <p className="text-sm text-muted-foreground">最新 50 条评论，按时间倒序展示。</p>
                </CardHeader>
                <CardContent>
                    {commentsQuery.isLoading && <p className="text-sm text-muted-foreground">加载中...</p>}
                    {!commentsQuery.isLoading && (
                        <div className="flex flex-col gap-3">
                            {commentTree.map((node) => (
                                <AdminCommentItem
                                    key={node.id}
                                    node={node}
                                    depth={0}
                                    onDelete={(id) => {
                                        if (confirm('确认删除这条评论吗？')) {
                                            deleteMutation.mutate(id)
                                        }
                                    }}
                                />
                            ))}

                            {!commentTree.length && <p className="text-sm text-muted-foreground">暂无评论</p>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

type AdminCommentItemProps = {
    node: CommentNode
    depth?: number
    onDelete: (id: number) => void
}

const AdminCommentItem = ({ node, depth = 0, onDelete }: AdminCommentItemProps) => {
    const indent = Math.min(depth * 20, 80)

    const containerClass =
        depth === 0
            ? 'rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col gap-2'
            : 'flex flex-col gap-2 border-l border-slate-100 pl-4 ml-4'

    return (
        <div className={containerClass}>
            <div className="flex items-center justify-between gap-2" style={{ paddingLeft: depth === 0 ? indent : 0 }}>
                <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 overflow-hidden">
                        <img
                            src={buildAvatarUrl(node.authorName || `comment-${node.id}`)}
                            alt={node.authorName || '匿名访客'}
                            className="h-full w-full object-cover"
                        />
                    </span>
                    <div className="min-w-0 space-y-1">
                        <p className="font-medium text-slate-800 break-words">{node.content}</p>
                        {depth === 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                                {node.articleTitle || '未知文章'} · {node.articleSlug ? `/post/${node.articleSlug}` : '无 slug'}
                            </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="font-medium text-slate-700">{node.authorName || '匿名访客'}</span>
                            {node.createdAt && (
                                <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" /> {new Date(node.createdAt).toLocaleString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground" style={{ paddingLeft: depth === 0 ? indent : 0 }}>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => onDelete(node.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {node.children.length > 0 && (
                <div className="space-y-3">
                    {node.children.map((child) => (
                        <AdminCommentItem key={child.id} node={child} depth={depth + 1} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    )
}
