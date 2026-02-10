import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { FileText, Trash2 } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleSummary, PageResult } from '../../types/api'
import { buildPostPath } from '../../lib/postPath'

export default function ArticleManagerPage() {
    const articlesQuery = useQuery({
        queryKey: ['admin-articles'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/admin/articles', {
                params: { page: 0, size: 50 },
            })
            return unwrapResponse(res.data)
        },
    })

    const publishMutation = useMutation({
        mutationFn: async ({ id, publish }: { id: number; publish: boolean }) => {
            const res = await api.post<ApiResponse<void>>(`/articles/${id}/publish`, null, {
                params: { publish },
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => articlesQuery.refetch(),
        onError: () => alert('更新发布状态失败'),
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/articles/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => articlesQuery.refetch(),
        onError: () => alert('删除文章失败，请稍后重试'),
    })

    const articles = articlesQuery.data?.content ?? []
    const loading = articlesQuery.isLoading

    const buildPath = (article: ArticleSummary) => {
        return buildPostPath(article.slug, article.category?.slugPath)
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-semibold font-display mb-2 text-[color:var(--ink)]">文章管理</h1>
                <p className="text-[color:var(--ink-muted)]">浏览、发布和管理现有文章。</p>
            </div>

            <Card className="overflow-hidden border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                <CardHeader>
                    <CardTitle className="text-[color:var(--ink)]">文章列表</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && <p className="text-sm text-[color:var(--ink-soft)]">加载中...</p>}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {articles.map((article) => (
                                <div
                                    key={article.id}
                                    className="group rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2 border-b border-[color:var(--card-border)] bg-[color:var(--paper-strong)]/60">
                                        <div className="h-9 w-9 rounded-md bg-[color:var(--paper-strong)] flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-[color:var(--ink-soft)]" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[color:var(--ink)] truncate max-w-[160px]">
                                                    {article.title}
                                                </span>
                                                <Badge
                                                    variant={article.status === 'PUBLISHED' ? 'default' : 'secondary'}
                                                    className={
                                                        article.status === 'PUBLISHED'
                                                            ? 'bg-[color:var(--accent)] text-white'
                                                            : 'bg-[color:var(--paper-strong)] text-[color:var(--ink-muted)]'
                                                    }
                                                >
                                                    {article.status === 'PUBLISHED' ? '已发布' : '草稿'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-[color:var(--ink-soft)]">{article.category?.name || '未分类'}</p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-3 space-y-2">
                                        <div className="text-xs text-[color:var(--ink-soft)]">
                                            浏览 {article.views} · 评论 {article.commentCount ?? 0}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--paper-strong)]"
                                                onClick={() => window.open(buildPath(article), '_blank')}
                                            >
                                                预览
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] hover:bg-[color:var(--paper-strong)]"
                                                onClick={() =>
                                                    publishMutation.mutate({
                                                        id: article.id,
                                                        publish: article.status !== 'PUBLISHED',
                                                    })
                                                }
                                            >
                                                {article.status === 'PUBLISHED' ? '取消发布' : '发布'}
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="text-[color:var(--ink-soft)] hover:text-[#b91c1c]"
                                                onClick={() => deleteMutation.mutate(article.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
