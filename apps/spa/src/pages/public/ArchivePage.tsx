import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PostCard } from '../../components/public/PostCard'
import { SearchBar } from '../../components/public/SearchBar'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import { flattenCategoryTree } from '../../lib/categoryTree'
import { resolveMediaUrl } from '../../lib/mediaUrl'
import { buildPostPath } from '../../lib/postPath'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'
import type { ArticleSummary, Category, CategoryArticleGroup, PageResult, Tag as TagDto } from '../../types/api'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1400&q=80&auto=format&fit=crop&sig=${seed}`

const ARCHIVE_PAGE_SIZE = 12
const CATEGORY_PREVIEW_LIMIT = 6

const formatDate = (value?: string) => {
    if (!value) return '待发布'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '待发布' : date.toLocaleDateString()
}

const getArticleCover = (post: ArticleSummary) => resolveMediaUrl(post.coverImage) || coverImageFor(post.id)

const normalizePage = (value: string | null) => {
    const page = Number(value ?? '1')
    if (!Number.isFinite(page) || page < 1) return 1
    return Math.floor(page)
}

export default function ArchivePage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const activeKeyword = (searchParams.get('q') ?? '').trim()
    const [keyword, setKeyword] = useState(activeKeyword)
    const categoryIdParam = searchParams.get('categoryId')
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
    const currentPage = normalizePage(searchParams.get('page'))
    const groupedMode = !activeKeyword && !categoryId

    useEffect(() => {
        setKeyword(activeKeyword)
    }, [activeKeyword])

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<Category[]>>('/categories')
            return unwrapResponse(res.data)
        },
    })

    const { data: tags = [] } = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<TagDto[]>>('/tags')
            return unwrapResponse(res.data)
        },
    })

    const { data: groupedArticles = [], isLoading: loadingGrouped } = useQuery({
        queryKey: ['articles', 'grouped', CATEGORY_PREVIEW_LIMIT],
        enabled: groupedMode,
        queryFn: async () => {
            const res = await api.get<ApiResponse<CategoryArticleGroup[]>>('/articles/grouped', {
                params: { perCategoryLimit: CATEGORY_PREVIEW_LIMIT },
            })
            return unwrapResponse(res.data)
        },
    })

    const { data: articlePage, isLoading: loadingArticles } = useQuery({
        queryKey: ['articles', 'archive', { activeKeyword, categoryId, currentPage }],
        enabled: !groupedMode,
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    keyword: activeKeyword || undefined,
                    categoryId,
                    page: currentPage - 1,
                    size: ARCHIVE_PAGE_SIZE,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const flattenedCategories = useMemo(() => flattenCategoryTree(categories), [categories])
    const activeCategory = flattenedCategories.find((category) => category.id === categoryId)
    const totalArticles = groupedMode
        ? groupedArticles.reduce((sum, group) => sum + group.totalCount, 0)
        : articlePage?.totalElements ?? 0
    const totalPages = groupedMode ? 1 : Math.max(1, articlePage?.totalPages ?? 1)
    const articles = articlePage?.content ?? []

    const handleSearch = () => {
        const next = new URLSearchParams(searchParams)
        const trimmedKeyword = keyword.trim()

        if (trimmedKeyword) {
            next.set('q', trimmedKeyword)
        } else {
            next.delete('q')
        }
        next.delete('page')
        setSearchParams(next)
    }

    const handleCategorySelect = (nextCategoryId?: number) => {
        const next = new URLSearchParams(searchParams)
        if (nextCategoryId) {
            next.set('categoryId', String(nextCategoryId))
        } else {
            next.delete('categoryId')
        }

        const trimmedKeyword = keyword.trim()
        if (trimmedKeyword) {
            next.set('q', trimmedKeyword)
        } else {
            next.delete('q')
        }

        next.delete('page')
        setSearchParams(next)
    }

    const handlePageChange = (nextPage: number) => {
        const safePage = Math.max(1, Math.min(totalPages, nextPage))
        const next = new URLSearchParams(searchParams)
        if (safePage <= 1) {
            next.delete('page')
        } else {
            next.set('page', String(safePage))
        }
        setSearchParams(next)
    }

    return (
        <div className="relative min-h-screen bg-paper font-body text-[color:var(--ink)]" style={paperThemeVars}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPatternStyle} />

            <section className="relative px-4 pb-10 pt-24 md:px-10">
                <div className="mx-auto max-w-6xl space-y-8">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4">
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">Archive</p>
                            <h1 className="text-[clamp(2.4rem,4.5vw,4.2rem)] font-display">文章归档</h1>
                            <p className="text-base leading-relaxed text-[color:var(--ink-muted)] md:text-lg">
                                这里不是简单的旧文列表，而是一条持续展开的写作地层。技术实验、主题思考与旅途见闻在此重新归位，方便你沿着分类、关键词与时间线，回到每一次问题被提出、被推演、被回答的现场。
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs">
                                <Link
                                    to="/"
                                    className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-2 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                                >
                                    返回首页
                                </Link>
                                <Link
                                    to="/about"
                                    className="rounded-full bg-[color:var(--ink)] px-4 py-2 font-semibold text-[color:var(--paper-soft)] transition-colors hover:bg-black"
                                >
                                    作者介绍
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_26px_55px_-42px_rgba(31,41,55,0.35)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Total</p>
                                    <h2 className="text-3xl font-display text-[color:var(--ink)]">{totalArticles}</h2>
                                </div>
                                <div className="text-right text-sm text-[color:var(--ink-muted)]">
                                    <div>分类 {categories.length}</div>
                                    <div>标签 {tags.length}</div>
                                </div>
                            </div>
                            <div className="mt-4 h-px bg-[color:var(--card-border)]" />
                            <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                {groupedMode
                                    ? '归档的意义不在于堆叠过去，而在于为过往建立可反复进入的秩序。你可以先从分类切入一条线索，再借搜索与分页回到具体问题，慢慢读出这些文章之间的隐秘连接。'
                                    : activeKeyword && activeCategory
                                      ? `当前按“${activeCategory.name} + ${activeKeyword}”联合过滤。`
                                      : activeKeyword
                                        ? `当前搜索关键词：${activeKeyword}`
                                        : activeCategory
                                          ? `当前查看分类：${activeCategory.name}`
                                          : '可通过搜索词和分类联合定位文章。'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <SearchBar
                            value={keyword}
                            onChange={setKeyword}
                            onSubmit={handleSearch}
                            tone="paper"
                            className="max-w-xl"
                            placeholder="搜索文章、摘要或关键词..."
                        />
                        <div className="flex flex-wrap gap-2 text-xs">
                            <button
                                type="button"
                                onClick={() => handleCategorySelect(undefined)}
                                className={clsx(
                                    'rounded-full border px-3 py-1.5 font-semibold transition-colors',
                                    !categoryId
                                        ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper-soft)]'
                                        : 'border-[color:var(--card-border)] bg-[color:var(--paper-soft)] text-[color:var(--ink-muted)] hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]'
                                )}
                            >
                                全部
                            </button>
                            {flattenedCategories.slice(0, 8).map((category) => (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => handleCategorySelect(category.id)}
                                    className={clsx(
                                        'rounded-full border px-3 py-1.5 font-semibold transition-colors',
                                        categoryId === category.id
                                            ? 'border-[color:var(--ink)] bg-[color:var(--ink)] text-[color:var(--paper-soft)]'
                                            : 'border-[color:var(--card-border)] bg-[color:var(--paper-soft)] text-[color:var(--ink-muted)] hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]'
                                    )}
                                >
                                    {`${category.prefix}${category.name}`}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-20 md:px-10">
                <div className="mx-auto max-w-6xl">
                    {groupedMode ? (
                        loadingGrouped ? (
                            <p className="text-sm text-[color:var(--ink-muted)]">正在加载归档分组...</p>
                        ) : groupedArticles.length ? (
                            <div className="space-y-6">
                                {groupedArticles.map((group) => (
                                    <div
                                        key={group.category.id}
                                        className="rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_24px_60px_-44px_rgba(31,41,55,0.35)]"
                                    >
                                        <div className="flex flex-col gap-4 border-b border-[color:var(--card-border)] pb-4 md:flex-row md:items-end md:justify-between">
                                            <div className="space-y-2">
                                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                                    分类分组
                                                </p>
                                                <h2 className="text-2xl font-display text-[color:var(--ink)]">
                                                    {group.category.name}
                                                </h2>
                                                <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                                    {group.category.description || '该分类下的文章将持续按发布时间更新。'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-[color:var(--ink-muted)]">
                                                <span>共 {group.totalCount} 篇</span>
                                                <Link
                                                    to={`/archive?categoryId=${group.category.id}`}
                                                    className="inline-flex items-center gap-1 font-semibold text-[color:var(--accent)]"
                                                >
                                                    查看全部
                                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                            {group.articles.map((post) => (
                                                <Link
                                                    key={post.id}
                                                    to={buildPostPath(post.slug, post.category?.slugPath)}
                                                    className="group relative isolate min-h-[220px] overflow-hidden rounded-[24px] border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]/45 hover:shadow-[0_28px_60px_-42px_rgba(15,23,42,0.48)]"
                                                >
                                                    <img
                                                        src={getArticleCover(post)}
                                                        alt={post.title}
                                                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                                    />
                                                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.4)_34%,rgba(15,23,42,0.78)_72%,rgba(15,23,42,0.92)_100%)]" />
                                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_32%),radial-gradient(circle_at_left_center,rgba(255,255,255,0.08),transparent_28%)]" />

                                                    <div className="relative z-10 flex h-full flex-col p-4 text-white">
                                                        <div className="flex items-center justify-between gap-3 text-[11px] font-medium tracking-[0.02em] text-white/88">
                                                            <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 backdrop-blur-sm">
                                                                {formatDate(post.publishedAt)}
                                                            </span>
                                                            <span className="rounded-full border border-white/20 bg-black/20 px-2.5 py-1 backdrop-blur-sm">
                                                                {post.category?.name || group.category.name}
                                                            </span>
                                                        </div>

                                                        <div className="mt-auto rounded-[20px] border border-white/10 bg-black/20 px-4 py-3.5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-[6px]">
                                                            <h3 className="line-clamp-2 text-xl font-display leading-snug text-white transition-colors group-hover:text-[#fde68a]">
                                                                {post.title}
                                                            </h3>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-10 text-center text-[color:var(--ink-muted)]">
                                当前还没有可归档的文章。
                            </div>
                        )
                    ) : loadingArticles ? (
                        <p className="text-sm text-[color:var(--ink-muted)]">正在加载文章...</p>
                    ) : articles.length ? (
                        <>
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--ink-muted)]">
                                <div>
                                    {activeCategory ? `分类：${activeCategory.name}` : '全部分类'} · 共 {totalArticles} 篇
                                </div>
                                <div>
                                    第 {currentPage} / {totalPages} 页
                                </div>
                            </div>
                            <div className="grid gap-6 md:grid-cols-2">
                                {articles.map((post, index) => (
                                    <PostCard
                                        key={post.id}
                                        id={post.id}
                                        title={post.title}
                                        excerpt={post.summary}
                                        slug={post.slug}
                                        categorySlugPath={post.category?.slugPath}
                                        coverImage={resolveMediaUrl(post.coverImage) || coverImageFor(post.id)}
                                        tags={post.tags?.map((tag) => tag.name)}
                                        publishDate={post.publishedAt}
                                        views={post.views}
                                        index={index}
                                    />
                                ))}
                            </div>
                            <div className="mt-10 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--card-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    上一页
                                </button>
                                <span className="text-sm text-[color:var(--ink-soft)]">
                                    第 {currentPage} / {totalPages} 页
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[color:var(--card-border)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    下一页
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-10 text-center text-[color:var(--ink-muted)]">
                            当前没有符合条件的文章，请换个关键词或分类试试。
                        </div>
                    )}

                    <div className="mt-10 flex items-center justify-center">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                        >
                            回到首页
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
