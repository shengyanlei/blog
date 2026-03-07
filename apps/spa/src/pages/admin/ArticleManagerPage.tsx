import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Eye, FileText, MessageSquare, Pencil, Star, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../../components/public/SearchBar'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import { buildPostPath } from '../../lib/postPath'
import type { ArticleSummary, PageResult } from '../../types/api'

const ADMIN_ARTICLE_PAGE_SIZE = 200

const getFeaturedLabel = (level = 0) => {
    if (level === 2) return '首页精选'
    if (level === 1) return '待阅清单'
    return '未精选'
}

const getFeaturedActionLabel = (level = 0) => {
    if (level === 0) return '加入待阅清单'
    if (level === 1) return '升级为首页精选'
    return '取消精选'
}

const getNextFeaturedLevel = (level = 0) => {
    if (level >= 2) return 0
    return level + 1
}

const formatVisibleDate = (article: ArticleSummary) => {
    const value = article.publishedAt ?? article.createdAt
    if (!value) return '待发布'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '待发布' : date.toLocaleDateString()
}

function FeaturedStarIcon({ level }: { level: number }) {
    const filledWidth = level === 2 ? '100%' : level === 1 ? '50%' : '0%'

    return (
        <span className="relative block h-5 w-5">
            <Star className="absolute inset-0 h-5 w-5 text-[color:var(--ink-soft)]" strokeWidth={1.9} />
            {level > 0 && (
                <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: filledWidth }}>
                    <Star className="h-5 w-5 fill-[#f59e0b] text-[#f59e0b]" strokeWidth={1.9} />
                </span>
            )}
        </span>
    )
}

export default function ArticleManagerPage() {
    const navigate = useNavigate()
    const [keyword, setKeyword] = useState('')
    const [appliedKeyword, setAppliedKeyword] = useState('')

    const articlesQuery = useQuery({
        queryKey: ['admin-articles'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/admin/articles', {
                params: {
                    page: 0,
                    size: ADMIN_ARTICLE_PAGE_SIZE,
                },
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
        onSuccess: () => {
            articlesQuery.refetch()
        },
        onError: () => {
            alert('更新发布状态失败')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/articles/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            articlesQuery.refetch()
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || '删除文章失败，请稍后重试')
        },
    })

    const featuredMutation = useMutation({
        mutationFn: async ({ id, featuredLevel }: { id: number; featuredLevel: number }) => {
            const res = await api.put<ApiResponse<ArticleSummary>>(`/admin/articles/${id}/featured-level`, {
                featuredLevel,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            articlesQuery.refetch()
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || '更新精选状态失败，请稍后重试')
        },
    })

    const articles = articlesQuery.data?.content ?? []
    const loading = articlesQuery.isLoading
    const normalizedAppliedKeyword = appliedKeyword.trim().toLowerCase()
    const filteredArticles = useMemo(() => {
        if (!normalizedAppliedKeyword) {
            return articles
        }

        return articles.filter((article) => {
            const haystacks = [
                article.title,
                article.summary,
                article.slug,
                article.category?.name,
                article.authorName,
                article.tags?.map((tag) => tag.name).join(' '),
            ]

            return haystacks.some((value) => value?.toLowerCase().includes(normalizedAppliedKeyword))
        })
    }, [articles, normalizedAppliedKeyword])
    const totalArticles = filteredArticles.length

    const groupedArticles = useMemo(() => {
        const groups = new Map<
            string,
            {
                key: string
                name: string
                description?: string
                articles: ArticleSummary[]
            }
        >()

        filteredArticles.forEach((article) => {
            const key = article.category?.id ? `category-${article.category.id}` : 'uncategorized'
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    name: article.category?.name || '未分类',
                    description: article.category?.description,
                    articles: [],
                })
            }
            groups.get(key)?.articles.push(article)
        })

        return Array.from(groups.values())
    }, [filteredArticles])

    const buildPath = (article: ArticleSummary) => buildPostPath(article.slug, article.category?.slugPath)

    const goToEditor = (article: ArticleSummary) => {
        if (article.status !== 'DRAFT') {
            alert('仅可编辑草稿文章，请先取消发布后再编辑')
            return
        }
        navigate(`/admin/write?articleId=${article.id}`)
    }

    const handleSearch = () => {
        setAppliedKeyword(keyword.trim())
    }

    const clearSearch = () => {
        setKeyword('')
        setAppliedKeyword('')
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="mb-2 font-display text-3xl font-semibold text-[color:var(--ink)]">文章管理</h1>
                <p className="text-[color:var(--ink-muted)]">按分类浏览、搜索并维护文章状态与首页展示优先级。</p>
            </div>

            <Card className="overflow-hidden border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-soft)]">
                                Admin Archive
                            </p>
                            <h2 className="font-display text-3xl text-[color:var(--ink)]">文章列表</h2>
                            <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                用更接近前台归档的方式管理内容：先看分类结构，再在封面卡片里处理发布、编辑和精选等级。
                            </p>
                        </div>

                        <div className="w-full max-w-xl space-y-3">
                            <SearchBar
                                value={keyword}
                                onChange={setKeyword}
                                onSubmit={handleSearch}
                                tone="paper"
                                className="max-w-none"
                                placeholder="搜索标题、摘要或正文..."
                            />
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--ink-soft)]">
                                <span>
                                    {appliedKeyword
                                        ? `搜索“${appliedKeyword}”共找到 ${totalArticles} 篇文章`
                                        : `当前展示 ${totalArticles} 篇文章，按最近可见时间排序`}
                                </span>
                                {appliedKeyword && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="font-semibold text-[color:var(--accent)] transition-colors hover:text-[color:var(--accent-strong)]"
                                    >
                                        清除搜索
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <p className="mt-8 text-sm text-[color:var(--ink-soft)]">正在加载文章...</p>
                    ) : groupedArticles.length ? (
                        <div className="mt-8 space-y-8">
                            {groupedArticles.map((group) => (
                                <section
                                    key={group.key}
                                    className="rounded-[30px] border border-[color:var(--card-border)] bg-[color:var(--paper)] p-6 shadow-[0_22px_50px_-42px_rgba(31,41,55,0.3)]"
                                >
                                    <div className="flex flex-col gap-4 border-b border-[color:var(--card-border)] pb-4 md:flex-row md:items-end md:justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                                分类分组
                                            </p>
                                            <h3 className="font-display text-2xl text-[color:var(--ink)]">{group.name}</h3>
                                            <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                                {group.description || '该分类下的文章将持续按最近更新时间排序，方便你从结构上维护整组内容。'}
                                            </p>
                                        </div>
                                        <div className="text-sm text-[color:var(--ink-muted)]">共 {group.articles.length} 篇</div>
                                    </div>

                                    <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                                        {group.articles.map((article) => (
                                            <article
                                                key={article.id}
                                                className="min-h-[224px] overflow-hidden rounded-[18px] border border-[color:var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,243,235,0.98))] shadow-[0_18px_40px_-34px_rgba(31,41,55,0.2)]"
                                            >
                                                <div className="flex h-full flex-col">
                                                    <div className="flex-1 border-b border-[color:var(--card-border)] p-4">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex min-w-0 flex-1 gap-3">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] text-[color:var(--ink-soft)]">
                                                                    <FileText className="h-4.5 w-4.5" />
                                                                </div>

                                                                <div className="min-w-0 flex-1 pr-1">
                                                                    <h4 className="line-clamp-2 min-h-[3.2rem] font-display text-[1.34rem] leading-[1.18] text-[color:var(--ink)]">
                                                                        {article.title}
                                                                    </h4>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--ink-soft)]">
                                                                        <span>{article.category?.name || '未分类'}</span>
                                                                        <span className="text-[color:var(--card-border)]">·</span>
                                                                        <span>{formatVisibleDate(article)}</span>
                                                                        <Badge
                                                                            variant={article.status === 'PUBLISHED' ? 'default' : 'secondary'}
                                                                            className={
                                                                                article.status === 'PUBLISHED'
                                                                                    ? 'h-5 rounded-full bg-[color:var(--accent)] px-2.5 text-[10px] text-white'
                                                                                    : 'h-5 rounded-full bg-[color:var(--paper-strong)] px-2.5 text-[10px] text-[color:var(--ink-muted)]'
                                                                            }
                                                                        >
                                                                            {article.status === 'PUBLISHED' ? '已发布' : '草稿'}
                                                                        </Badge>
                                                                    </div>

                                                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--ink-soft)]">
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <Eye className="h-3.5 w-3.5" />
                                                                            {article.views}
                                                                        </span>
                                                                        <span className="inline-flex items-center gap-1">
                                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                                            {article.commentCount ?? 0}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-white transition-colors hover:border-[#f59e0b]/50 hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-60"
                                                                    onClick={() =>
                                                                        featuredMutation.mutate({
                                                                            id: article.id,
                                                                            featuredLevel: getNextFeaturedLevel(
                                                                                article.featuredLevel ?? 0,
                                                                            ),
                                                                        })
                                                                    }
                                                                    disabled={
                                                                        featuredMutation.isPending &&
                                                                        featuredMutation.variables?.id === article.id
                                                                    }
                                                                    title={`${getFeaturedLabel(article.featuredLevel ?? 0)}，点击${getFeaturedActionLabel(article.featuredLevel ?? 0)}`}
                                                                    aria-label={`${getFeaturedLabel(article.featuredLevel ?? 0)}，点击${getFeaturedActionLabel(article.featuredLevel ?? 0)}`}
                                                                >
                                                                    <FeaturedStarIcon level={article.featuredLevel ?? 0} />
                                                                </button>
                                                                <span className="max-w-[56px] text-center text-[11px] font-medium leading-tight text-[color:var(--ink-soft)]">
                                                                    {getFeaturedLabel(article.featuredLevel ?? 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 p-4">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-strong)] hover:text-[color:var(--ink)]"
                                                            onClick={() => window.open(buildPath(article), '_blank')}
                                                        >
                                                            预览
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-strong)] hover:text-[color:var(--ink)]"
                                                            onClick={() => goToEditor(article)}
                                                            disabled={article.status !== 'DRAFT'}
                                                            title={article.status === 'DRAFT' ? '编辑草稿文章' : '请先取消发布后再编辑'}
                                                        >
                                                            <Pencil className="mr-1 h-3.5 w-3.5" />
                                                            编辑
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-strong)] hover:text-[color:var(--ink)]"
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
                                                            className="ml-auto text-[color:var(--ink-soft)] hover:text-[#b91c1c]"
                                                            onClick={() => {
                                                                if (article.status === 'PUBLISHED') {
                                                                    alert('已发布文章请先取消发布后再删除')
                                                                    return
                                                                }
                                                                if (!confirm(`确认删除文章《${article.title}》吗？`)) return
                                                                deleteMutation.mutate(article.id)
                                                            }}
                                                            disabled={article.status === 'PUBLISHED'}
                                                            title={article.status === 'PUBLISHED' ? '请先取消发布后再删除' : '删除文章'}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className="mt-8 rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper)] p-10 text-center text-[color:var(--ink-muted)]">
                            {appliedKeyword ? `没有找到与“${appliedKeyword}”相关的文章。` : '当前还没有可管理的文章。'}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
