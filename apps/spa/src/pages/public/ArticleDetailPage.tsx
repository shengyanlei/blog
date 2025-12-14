import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Calendar, Eye, PenSquare, Send, Sparkles, User } from 'lucide-react'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Separator } from '@repo/ui/components/ui/separator'
import MarkdownPreview from '@uiw/react-markdown-preview'
import '@uiw/react-markdown-preview/markdown.css'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleDetail, Comment } from '../../types/api'

const extractSlugFromPath = (pathname: string, fallback?: string) => {
    const segments = pathname.split('/').filter(Boolean)
    const last = segments.pop()
    return last || fallback || ''
}

const extractCategoryPathFromPathname = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] === 'post') segments.shift()
    if (!segments.length) return ''
    segments.pop()
    const joined = segments.join('/')
    return joined ? `/${joined}` : ''
}

export default function ArticleDetailPage() {
    const location = useLocation()
    const params = useParams()
    const slug = useMemo(() => extractSlugFromPath(location.pathname, params.slug), [location.pathname, params.slug])
    const derivedCategoryPath = useMemo(() => extractCategoryPathFromPathname(location.pathname), [location.pathname])
    const [commentAuthor, setCommentAuthor] = useState('')
    const [commentContent, setCommentContent] = useState('')
    const [readProgress, setReadProgress] = useState(0)
    const contentRef = useRef<HTMLDivElement | null>(null)

    const {
        data: article,
        isLoading: loadingArticle,
        isError: articleError,
    } = useQuery({
        queryKey: ['article', slug],
        enabled: Boolean(slug),
        queryFn: async () => {
            const res = await api.get<ApiResponse<ArticleDetail>>(`/articles/slug/${slug}`)
            return unwrapResponse(res.data)
        },
    })

    const {
        data: comments = [],
        refetch: refetchComments,
        isLoading: loadingComments,
    } = useQuery({
        queryKey: ['comments', article?.id],
        enabled: Boolean(article?.id),
        queryFn: async () => {
            const res = await api.get<ApiResponse<Comment[]>>(`/articles/${article?.id}/comments`)
            return unwrapResponse(res.data)
        },
    })

    const submitComment = useMutation({
        mutationFn: async () => {
            if (!article?.id) return
            const res = await api.post<ApiResponse<Comment>>(`/articles/${article.id}/comments`, {
                authorName: commentAuthor,
                content: commentContent,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setCommentAuthor('')
            setCommentContent('')
            refetchComments()
        },
        onError: (error: any) => {
            console.error(error)
            alert('评论提交失败，请稍后重试')
        },
    })

    useEffect(() => {
        const updateProgress = () => {
            if (!contentRef.current) {
                setReadProgress(0)
                return
            }
            const el = contentRef.current
            const viewHeight = window.innerHeight
            const offsetTop = el.getBoundingClientRect().top + window.scrollY
            const total = Math.max(el.offsetHeight - viewHeight * 0.5, 0)
            const passed = window.scrollY - offsetTop + viewHeight * 0.35
            const ratio = Math.min(Math.max(passed, 0), total)
            setReadProgress(total > 0 ? (ratio / total) * 100 : 0)
        }

        updateProgress()
        window.addEventListener('scroll', updateProgress, { passive: true })
        window.addEventListener('resize', updateProgress)
        return () => {
            window.removeEventListener('scroll', updateProgress)
            window.removeEventListener('resize', updateProgress)
        }
    }, [article?.id])

    if (loadingArticle) {
        return <p className="p-6 text-center text-muted-foreground">文章加载中...</p>
    }

    if (articleError || !article || !slug) {
        return <p className="p-6 text-center text-muted-foreground">文章不存在或已被移除。</p>
    }

    const formattedDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : '草稿'
    const breadcrumbCategory = article.category?.slugPath
        ? `/${article.category.slugPath}`
        : derivedCategoryPath || article.category?.name || '未分类'

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-50">
            <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 top-24 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px]" />
            <div className="pointer-events-none absolute left-20 bottom-10 h-60 w-60 rounded-full bg-cyan-400/20 blur-3xl" />

            <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-12 lg:px-6">
                <div className="flex items-center gap-2 text-sm text-slate-200/80">
                    <Link to="/" className="transition-colors hover:text-white">
                        首页
                    </Link>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-100">{breadcrumbCategory}</span>
                </div>

                <div className="group relative mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-800 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur">
                    <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(129,140,248,0.15),transparent_30%),radial-gradient(circle_at_60%_80%,rgba(236,72,153,0.12),transparent_28%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0.08)_48%,rgba(255,255,255,0)_72%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10">
                        <div
                            className="h-full bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-400 transition-[width] duration-300 ease-out"
                            style={{ width: `${readProgress}%` }}
                        />
                    </div>
                    <div className="absolute right-6 top-6 text-[10px] uppercase tracking-[0.3em] text-white/30 opacity-0 transition duration-500 group-hover:opacity-80">
                        Keep scrolling -
                    </div>

                    <div className="relative z-10 space-y-6 px-7 py-9 text-white md:px-10 md:py-12">
                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur">
                                <Sparkles className="h-4 w-4" />
                                精选文章
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-white/80">
                                {breadcrumbCategory}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-white/60">
                                slug · {slug}
                            </span>
                        </div>

                        <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-5xl">{article.title}</h1>

                        {article.summary && (
                            <p className="max-w-3xl text-lg leading-relaxed text-white/70">{article.summary}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                                <Calendar className="h-4 w-4" />
                                {formattedDate}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                                <Eye className="h-4 w-4" />
                                {article.views} 次阅读
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                                <User className="h-4 w-4" />
                                {article.authorName ?? '佚名'}
                            </span>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                                <PenSquare className="h-4 w-4" />
                                {article.updatedAt
                                    ? `最近更新 ${new Date(article.updatedAt).toLocaleDateString()}`
                                    : '保持更新中'}
                            </span>
                        </div>

                        {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {article.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="border border-white/20 bg-white/10 px-3 py-1 text-white transition hover:border-white/40 hover:bg-white/20"
                                    >
                                        #{tag.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative mt-10 space-y-10 text-slate-800">
                    <div className="absolute -left-24 top-0 h-32 w-32 rounded-full bg-indigo-200/40 blur-3xl" />
                    <Card className="relative overflow-hidden border border-slate-200/70 bg-white/90 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] backdrop-blur">
                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
                        <div className="absolute right-6 top-6 h-12 w-12 rounded-full bg-gradient-to-br from-indigo-200 via-pink-200 to-cyan-200 blur-2xl" />
                        <CardContent className="relative px-6 py-8 md:px-10 md:py-10">
                            <div
                                ref={contentRef}
                                className="prose prose-lg max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-800 prose-a:text-indigo-600 prose-strong:text-slate-900"
                                data-color-mode="light"
                            >
                                <MarkdownPreview
                                    source={article.content}
                                    className="!bg-transparent !text-slate-800 [&_*]:!bg-transparent"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <section className="relative space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Feedback</p>
                                <h2 className="text-2xl font-bold text-slate-900">评论</h2>
                            </div>
                            <span className="rounded-full bg-slate-900/5 px-3 py-1 text-sm text-slate-600 shadow-inner">
                                {loadingComments ? '加载中...' : `${comments.length} 条评论`}
                            </span>
                        </div>

                        <Card className="relative overflow-hidden border border-slate-200/70 bg-white/90 shadow-lg backdrop-blur">
                            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />
                            <CardContent className="space-y-4 pt-8">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">昵称</label>
                                        <input
                                            className="w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                            placeholder="留下您的名字"
                                            value={commentAuthor}
                                            onChange={(e) => setCommentAuthor(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-sm font-medium text-slate-700">评论内容</label>
                                        <textarea
                                            className="min-h-[120px] w-full rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200"
                                            placeholder="友善交流，欢迎留下想法......"
                                            value={commentContent}
                                            onChange={(e) => setCommentContent(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-slate-500">
                                        评论提交后将进入审核队列，审核通过后会展示在下方。
                                    </p>
                                    <Button
                                        onClick={() => submitComment.mutate()}
                                        disabled={submitComment.isPending || !commentAuthor || !commentContent}
                                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-5 text-white shadow-md transition hover:shadow-lg disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300"
                                    >
                                        {submitComment.isPending ? (
                                            '提交中...'
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4" />
                                                提交评论
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="relative space-y-4">
                            <div className="absolute left-4 top-3 bottom-3 w-px bg-gradient-to-b from-indigo-200 via-pink-200 to-transparent" />
                            {comments.map((comment) => (
                                <div key={comment.id} className="relative pl-10">
                                    <div className="absolute left-2 top-6 h-3 w-3 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]" />
                                    <Card className="border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
                                        <CardContent className="py-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
                                                <span className="font-medium text-slate-800">{comment.authorName}</span>
                                                <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                                            </div>
                                            <Separator className="my-3" />
                                            <p className="whitespace-pre-wrap text-slate-800 leading-7">{comment.content}</p>
                                            {comment.status !== 'APPROVED' && (
                                                <p className="mt-2 text-xs text-amber-600">待审核</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                            {!comments.length && !loadingComments && (
                                <p className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
                                    暂时还没有评论，欢迎抢沙发！
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
