import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { FileText, Trash2 } from 'lucide-react'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleSummary, PageResult } from '../../types/api'

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
        const catPath = article.category?.slugPath
        return catPath ? `/post/${catPath}/${article.slug}` : `/post/${article.slug}`
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">文章管理</h1>
                <p className="text-muted-foreground">浏览、发布和管理现有文章。</p>
            </div>

            <Card className="overflow-hidden border border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>文章列表</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && <p className="text-sm text-muted-foreground">加载中...</p>}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {articles.map((article) => (
                                <div
                                    key={article.id}
                                    className="group rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-100 bg-slate-50">
                                        <div className="h-9 w-9 rounded-md bg-slate-200 flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                                                    {article.title}
                                                </span>
                                                <Badge variant={article.status === 'PUBLISHED' ? 'default' : 'secondary'}>
                                                    {article.status === 'PUBLISHED' ? '已发布' : '草稿'}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {buildPath(article)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 space-y-2 text-xs text-muted-foreground">
                                        <div className="flex items-center justify-between">
                                            <span>阅读 {article.views}</span>
                                            {article.publishedAt ? (
                                                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                                            ) : (
                                                <span>未发布</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    publishMutation.mutate({
                                                        id: article.id,
                                                        publish: article.status !== 'PUBLISHED',
                                                    })
                                                }
                                            >
                                                {article.status === 'PUBLISHED' ? '下架' : '发布'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600"
                                                onClick={() => {
                                                    if (confirm('确认删除这篇文章？')) {
                                                        deleteMutation.mutate(article.id)
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!articles.length && (
                                <div className="col-span-full text-sm text-muted-foreground">暂无文章</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
