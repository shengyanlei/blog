import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { PostCard } from '../../components/public/PostCard'
import { SearchBar } from '../../components/public/SearchBar'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleSummary, Category, Tag as TagDto, PageResult } from '../../types/api'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1400&q=80&auto=format&fit=crop&sig=${seed}`

export default function ArchivePage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
    const categoryIdParam = searchParams.get('categoryId')
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined

    const { data: articlePage, isLoading: loadingArticles } = useQuery({
        queryKey: ['articles', { keyword, categoryId }],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    keyword: keyword || undefined,
                    categoryId,
                    page: 0,
                    size: 12,
                },
            })
            return unwrapResponse(res.data)
        },
    })

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

    const articles = articlePage?.content ?? []

    const handleSearch = () => {
        const next = new URLSearchParams(searchParams)
        if (keyword) {
            next.set('q', keyword)
        } else {
            next.delete('q')
        }
        if (categoryId) {
            next.set('categoryId', String(categoryId))
        } else {
            next.delete('categoryId')
        }
        setSearchParams(next)
    }

    const handleCategorySelect = (id?: number) => {
        const next = new URLSearchParams(searchParams)
        if (id) {
            next.set('categoryId', String(id))
        } else {
            next.delete('categoryId')
        }
        if (keyword) {
            next.set('q', keyword)
        } else {
            next.delete('q')
        }
        setSearchParams(next)
    }

    return (
        <div className="relative min-h-screen bg-paper font-body text-[color:var(--ink)]" style={paperThemeVars}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPatternStyle} />

            <section className="relative px-4 pt-24 pb-10 md:px-10">
                <div className="mx-auto max-w-6xl space-y-8">
                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="space-y-4">
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">Archive</p>
                            <h1 className="text-[clamp(2.4rem,4.5vw,4.2rem)] font-display">文章归档</h1>
                            <p className="text-base md:text-lg text-[color:var(--ink-muted)] leading-relaxed">
                                用专题与时间线重新整理内容，快速找到你需要的灵感与案例。
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
                                    <h2 className="text-3xl font-display text-[color:var(--ink)]">{articlePage?.totalElements ?? 0}</h2>
                                </div>
                                <div className="text-right text-sm text-[color:var(--ink-muted)]">
                                    <div>类目 {categories.length}</div>
                                    <div>标签 {tags.length}</div>
                                </div>
                            </div>
                            <div className="mt-4 h-px bg-[color:var(--card-border)]" />
                            <p className="mt-4 text-sm text-[color:var(--ink-muted)]">
                                按主题筛选或直接检索关键词，快速定位目标文章。
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
                            placeholder="搜索文章、标签或关键词..."
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
                            {categories.slice(0, 8).map((category) => (
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
                                    {category.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-20 md:px-10">
                <div className="mx-auto max-w-6xl">
                    {loadingArticles ? (
                        <p className="text-sm text-[color:var(--ink-muted)]">加载中...</p>
                    ) : articles.length ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            {articles.map((post, index) => (
                                <PostCard
                                    key={post.id}
                                    id={post.id}
                                    title={post.title}
                                    excerpt={post.summary}
                                    slug={post.slug}
                                    categorySlugPath={post.category?.slugPath}
                                    coverImage={post.coverImage || coverImageFor(post.id)}
                                    tags={post.tags?.map((t) => t.name)}
                                    publishDate={post.publishedAt}
                                    views={post.views}
                                    index={index}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-10 text-center text-[color:var(--ink-muted)]">
                            暂无文章，稍后再来。
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

