import { useMemo, useState, type CSSProperties } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BookOpen, MapPin, User } from 'lucide-react'
import { PostCard } from '../../components/public/PostCard'
import { CategoryCard } from '../../components/public/CategoryCard'
import { SearchBar } from '../../components/public/SearchBar'
import { TagCloud } from '../../components/public/TagCloud'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar'
import { useHeroCarousel } from '../../hooks/useHeroCarousel'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleSummary, Category, Tag as TagDto, PageResult } from '../../types/api'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1400&q=80&auto=format&fit=crop&sig=${seed}`

const buildPostLink = (slug: string, categorySlugPath?: string) => {
    const normalized = categorySlugPath?.replace(/^\/+|\/+$/g, '')
    return normalized ? `/post/${normalized}/${slug}` : `/post/${slug}`
}

const formatDate = (value?: string) => {
    if (!value) return '待发布'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '待发布' : date.toLocaleDateString()
}

export default function HomePage() {
    const { currentImage } = useHeroCarousel()
    const [searchParams, setSearchParams] = useSearchParams()
    const [keyword, setKeyword] = useState(searchParams.get('q') ?? '')
    const categoryIdParam = searchParams.get('categoryId')
    const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
    const shouldReduceMotion = useReducedMotion()

    const themeStyles = useMemo(
        () =>
            ({
                '--paper': '#f6f1e7',
                '--paper-soft': '#fbf8f2',
                '--paper-strong': '#efe6d7',
                '--ink': '#1f2933',
                '--ink-muted': '#6b6157',
                '--ink-soft': '#8a8076',
                '--accent': '#b45309',
                '--teal': '#0f766e',
                '--card-border': '#e3d8c8',
                '--shadow-soft': '0 32px 60px -44px rgba(31, 41, 55, 0.35)',
                '--font-display': '"Libre Bodoni", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Times New Roman", serif',
                '--font-body': '"Public Sans", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
            }) as CSSProperties,
        []
    )

    const paperPattern = useMemo(
        () =>
            ({
                backgroundImage:
                    'radial-gradient(circle at 12% 18%, rgba(180, 83, 9, 0.12), transparent 45%), radial-gradient(circle at 88% 0%, rgba(15, 118, 110, 0.12), transparent 40%), linear-gradient(transparent 93%, rgba(31, 41, 55, 0.04) 93%), linear-gradient(90deg, transparent 93%, rgba(31, 41, 55, 0.04) 93%)',
                backgroundSize: '280px 280px, 320px 320px, 32px 32px, 32px 32px',
            }) as CSSProperties,
        []
    )

    const heroMotion = shouldReduceMotion
        ? {}
        : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } }

    const imageTransition = { duration: shouldReduceMotion ? 0 : 0.8 }

    const { data: articlePage, isLoading: loadingArticles } = useQuery({
        queryKey: ['articles', { keyword, categoryId }],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    keyword: keyword || undefined,
                    categoryId,
                    page: 0,
                    size: 10,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const articles = articlePage?.content ?? []
    const featuredPost = articles[0]
    const latestPosts = featuredPost ? articles.slice(1) : articles
    const spotlightPosts = latestPosts.slice(0, 3)
    const featuredImage = featuredPost ? coverImageFor(featuredPost.id) : currentImage

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

    const tagCloud = useMemo(
        () => tags.map((tag) => ({ name: tag.name, count: 1 })),
        [tags]
    )

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

    return (
        <div className="relative min-h-screen font-body bg-paper text-[color:var(--ink)]" style={themeStyles}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPattern} />

            <section className="relative px-4 pt-24 pb-14 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                                Glacier Log
                            </div>
                            <h1 className="text-[clamp(2.75rem,5vw,5rem)] font-display leading-[1.05]">
                                霜蓝札记
                            </h1>
                            <p className="max-w-xl text-base md:text-lg text-[color:var(--ink-muted)] leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:text-4xl first-letter:leading-none first-letter:font-display first-letter:text-[color:var(--accent)]">
                                在设计、代码与慢旅行之间，收集清冷的观察与技术笔记，把灵感写成可以回访的地标。
                            </p>
                            <SearchBar
                                value={keyword}
                                onChange={setKeyword}
                                onSubmit={handleSearch}
                                className="max-w-xl"
                                tone="paper"
                                placeholder="搜索文章、主题或城市..."
                            />
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                <Link
                                    to="/archive"
                                    className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-2 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                                >
                                    浏览归档
                                </Link>
                                <Link
                                    to="/about"
                                    className="rounded-full bg-[color:var(--ink)] px-4 py-2 font-semibold text-[color:var(--paper-soft)] transition-colors hover:bg-black"
                                >
                                    关于我
                                </Link>
                                <Link
                                    to="/footprint"
                                    className="rounded-full border border-[color:var(--card-border)] px-4 py-2 font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                                >
                                    足迹记录
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs text-[color:var(--ink-muted)]">
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-3">
                                    <div className="text-lg font-semibold text-[color:var(--ink)]">
                                        {articlePage?.totalElements ?? 0}
                                    </div>
                                    <div>篇文章</div>
                                </div>
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-3">
                                    <div className="text-lg font-semibold text-[color:var(--ink)]">
                                        {categories.length}
                                    </div>
                                    <div>类目</div>
                                </div>
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-3">
                                    <div className="text-lg font-semibold text-[color:var(--ink)]">{tags.length}</div>
                                    <div>标签</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <motion.div
                                {...heroMotion}
                                className="overflow-hidden rounded-[28px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_35px_70px_-55px_rgba(31,41,55,0.5)]"
                            >
                                <div className="relative h-48 md:h-56">
                                    {featuredImage ? (
                                        <AnimatePresence initial={false}>
                                            <motion.div
                                                key={featuredImage}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={imageTransition}
                                                className="absolute inset-0 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${featuredImage})` }}
                                            />
                                        </AnimatePresence>
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                                    <div className="absolute left-5 top-5 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700">
                                        Featured
                                    </div>
                                </div>
                                <div className="space-y-4 p-6">
                                    <h3 className="text-2xl font-display text-[color:var(--ink)]">
                                        {featuredPost?.title ?? '欢迎来到霜蓝札记'}
                                    </h3>
                                    <p className="text-sm text-[color:var(--ink-muted)] line-clamp-2">
                                        {featuredPost?.summary ?? '用清晰的记录沉淀灵感与实践。'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(featuredPost?.tags ?? []).slice(0, 3).map((tag) => (
                                            <span
                                                key={tag.name}
                                                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-3 py-1 text-xs text-[color:var(--ink-muted)]"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        <Link
                                            to={
                                                featuredPost
                                                    ? buildPostLink(featuredPost.slug, featuredPost.category?.slugPath)
                                                    : '/archive'
                                            }
                                            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                                        >
                                            阅读
                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                            Reading Queue
                                        </p>
                                        <span className="text-xs text-[color:var(--ink-soft)]">
                                            {spotlightPosts.length} 篇
                                        </span>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {loadingArticles ? (
                                            <p className="text-sm text-[color:var(--ink-muted)]">加载中...</p>
                                        ) : spotlightPosts.length ? (
                                            spotlightPosts.map((post, index) => (
                                                <Link
                                                    key={post.id}
                                                    to={buildPostLink(post.slug, post.category?.slugPath)}
                                                    className="group flex items-start gap-3 rounded-xl border border-[color:var(--card-border)] bg-white/70 p-3 transition-colors hover:border-[color:var(--accent)]/40"
                                                >
                                                    <span className="text-xs font-semibold text-[color:var(--ink-soft)]">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[color:var(--ink)] group-hover:text-[color:var(--accent)] line-clamp-1">
                                                            {post.title}
                                                        </p>
                                                        <p className="text-xs text-[color:var(--ink-muted)]">
                                                            {formatDate(post.publishedAt)}
                                                        </p>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-sm text-[color:var(--ink-muted)]">暂无推荐文章</p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                                Archive
                                            </p>
                                            <h3 className="text-lg font-display text-[color:var(--ink)]">深度归档</h3>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-[color:var(--ink-muted)]">
                                        以时间线和专题维度浏览全部文章。
                                    </p>
                                    <Link
                                        to="/archive"
                                        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                                    >
                                        进入归档
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-16 md:px-10">
                <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="flex items-end justify-between border-b border-[color:var(--card-border)] pb-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                                    Collections
                                </p>
                                <h2 className="text-2xl font-display text-[color:var(--ink)]">主题合集</h2>
                            </div>
                            <Link
                                to="/archive"
                                className="text-xs text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--accent)]"
                            >
                                查看全部
                            </Link>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {categories.slice(0, 4).map((category, index) => (
                                <CategoryCard
                                    key={category.id}
                                    id={category.id}
                                    name={category.name}
                                    description={category.description}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-14 w-14 border border-[color:var(--card-border)] bg-white">
                                    <AvatarImage src="https://avatars.githubusercontent.com/u/1?v=4" />
                                    <AvatarFallback>SY</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                        Author
                                    </p>
                                    <h3 className="text-lg font-display text-[color:var(--ink)]">shyl</h3>
                                    <p className="text-xs text-[color:var(--ink-muted)]">
                                        用视觉与文字记录理性与感性的交汇。
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                <Link
                                    to="/about"
                                    className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1.5 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                                >
                                    了解作者
                                </Link>
                                <Link
                                    to="/about"
                                    className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-3 py-1.5 font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                                >
                                    合作方式
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                        Tags
                                    </p>
                                    <h3 className="text-lg font-display text-[color:var(--ink)]">关键词地图</h3>
                                </div>
                            </div>
                            <div className="mt-4">
                                <TagCloud tags={tagCloud} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-16 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-end justify-between border-b border-[color:var(--card-border)] pb-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">Latest</p>
                            <h2 className="text-2xl font-display text-[color:var(--ink)]">最新文章</h2>
                        </div>
                        <span className="text-xs text-[color:var(--ink-soft)]">共 {articles.length} 篇</span>
                    </div>
                    <div className="mt-8">
                        {loadingArticles ? (
                            <p className="text-sm text-[color:var(--ink-muted)]">加载中...</p>
                        ) : latestPosts.length ? (
                            <div className="grid gap-6 md:grid-cols-2">
                                {latestPosts.map((post, index) => (
                                    <PostCard
                                        key={post.id}
                                        id={post.id}
                                        title={post.title}
                                        excerpt={post.summary}
                                        slug={post.slug}
                                        categorySlugPath={post.category?.slugPath}
                                        coverImage={coverImageFor(post.id)}
                                        tags={post.tags?.map((t) => t.name)}
                                        publishDate={post.publishedAt}
                                        views={post.views}
                                        index={index}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[color:var(--ink-muted)]">暂无文章，稍后再来。</p>
                        )}
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-24 md:px-10">
                <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    Footprint
                                </p>
                                <h3 className="text-lg font-display text-[color:var(--ink)]">城市足迹</h3>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-[color:var(--ink-muted)]">
                            将旅行、展览与日常路径叠加成一张时序地图。
                        </p>
                        <Link
                            to="/footprint"
                            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                        >
                            查看足迹
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    Contact
                                </p>
                                <h3 className="text-lg font-display text-[color:var(--ink)]">合作与交流</h3>
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-[color:var(--ink-muted)]">
                            欢迎分享想法或提出合作需求。
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            <Link
                                to="/about"
                                className="rounded-full border border-[color:var(--card-border)] bg-white px-3 py-1.5 font-semibold text-[color:var(--ink)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                            >
                                联系方式
                            </Link>
                            <Link
                                to="/about"
                                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-3 py-1.5 font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)]"
                            >
                                项目协作
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
