import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, FileText, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar'
import { CategoryCard } from '../../components/public/CategoryCard'
import { PostCard } from '../../components/public/PostCard'
import { SearchBar } from '../../components/public/SearchBar'
import { TagCloud } from '../../components/public/TagCloud'
import { getSiteConfig } from '../../config/siteConfig'
import { useHeroCarousel } from '../../hooks/useHeroCarousel'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import { resolveMediaUrl } from '../../lib/mediaUrl'
import { buildPostPath } from '../../lib/postPath'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'
import type { ArticleSummary, Category, PageResult, Tag as TagDto } from '../../types/api'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1400&q=80&auto=format&fit=crop&sig=${seed}`

const READING_QUEUE_PAGE_SIZE = 4
const FEATURED_ROTATION_MS = 6000
const LATEST_SECTION_SIZE = 6

const formatDate = (value?: string) => {
    if (!value) return '待发布'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '待发布' : date.toLocaleDateString()
}

const getHeroBadge = (featuredCount: number, activePost?: ArticleSummary) => {
    if (featuredCount > 1) return '精选轮播'
    if (featuredCount === 1) return '精选内容'
    if (activePost) return '最近更新'
    return '欢迎'
}

export default function HomePage() {
    const navigate = useNavigate()
    const { currentImage } = useHeroCarousel()
    const config = getSiteConfig()
    const brand = config.site.brand
    const profile = config.site.profile
    const shouldReduceMotion = useReducedMotion()

    const [keyword, setKeyword] = useState('')
    const [featuredIndex, setFeaturedIndex] = useState(0)
    const [readingQueuePage, setReadingQueuePage] = useState(0)
    const [carouselPaused, setCarouselPaused] = useState(false)

    const heroMotion = shouldReduceMotion
        ? {}
        : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } }

    const imageTransition = { duration: shouldReduceMotion ? 0 : 0.8 }

    const { data: articleStats } = useQuery({
        queryKey: ['articles', 'stats'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: { page: 0, size: 1 },
            })
            return unwrapResponse(res.data)
        },
    })

    const { data: featuredArticlePage, isLoading: loadingFeatured } = useQuery({
        queryKey: ['articles', 'featured-carousel'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    featuredLevel: 2,
                    page: 0,
                    size: 5,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const { data: readingQueuePageData, isLoading: loadingReadingQueue } = useQuery({
        queryKey: ['articles', 'reading-queue'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    featuredLevel: 1,
                    page: 0,
                    size: 12,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const { data: latestArticlePage, isLoading: loadingLatest } = useQuery({
        queryKey: ['articles', 'latest-plain'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/articles', {
                params: {
                    excludeFeatured: true,
                    page: 0,
                    size: LATEST_SECTION_SIZE + 1,
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

    const featuredPosts = featuredArticlePage?.content ?? []
    const readingQueuePosts = readingQueuePageData?.content ?? []
    const latestPosts = latestArticlePage?.content ?? []
    const fallbackHeroPost = featuredPosts.length ? undefined : latestPosts[0]
    const activeHeroPost = featuredPosts.length ? featuredPosts[featuredIndex] : fallbackHeroPost
    const featuredImage = activeHeroPost
        ? resolveMediaUrl(activeHeroPost.coverImage) || coverImageFor(activeHeroPost.id)
        : currentImage
    const visibleLatestPosts = useMemo(
        () =>
            featuredPosts.length
                ? latestPosts.slice(0, LATEST_SECTION_SIZE)
                : latestPosts.slice(1, LATEST_SECTION_SIZE + 1),
        [featuredPosts.length, latestPosts]
    )
    const tagCloud = useMemo(() => tags.map((tag) => ({ name: tag.name, count: 1 })), [tags])

    useEffect(() => {
        if (!featuredPosts.length) {
            setFeaturedIndex(0)
            return
        }
        setFeaturedIndex((current) => (current >= featuredPosts.length ? 0 : current))
    }, [featuredPosts.length])

    useEffect(() => {
        if (featuredPosts.length <= 1 || shouldReduceMotion || carouselPaused) {
            return
        }

        const timer = window.setInterval(() => {
            setFeaturedIndex((current) => (current + 1) % featuredPosts.length)
        }, FEATURED_ROTATION_MS)

        return () => window.clearInterval(timer)
    }, [carouselPaused, featuredPosts.length, shouldReduceMotion])

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(readingQueuePosts.length / READING_QUEUE_PAGE_SIZE))
        setReadingQueuePage((current) => Math.min(current, totalPages - 1))
    }, [readingQueuePosts.length])

    const readingQueueTotalPages = Math.max(1, Math.ceil(readingQueuePosts.length / READING_QUEUE_PAGE_SIZE))
    const visibleReadingQueuePosts = useMemo(() => {
        const start = readingQueuePage * READING_QUEUE_PAGE_SIZE
        return readingQueuePosts.slice(start, start + READING_QUEUE_PAGE_SIZE)
    }, [readingQueuePage, readingQueuePosts])

    const handleSearch = () => {
        const trimmedKeyword = keyword.trim()
        if (!trimmedKeyword) {
            navigate('/archive')
            return
        }
        navigate(`/archive?q=${encodeURIComponent(trimmedKeyword)}`)
    }

    const handleFeaturedStep = (direction: -1 | 1) => {
        if (featuredPosts.length <= 1) return
        setFeaturedIndex((current) => (current + direction + featuredPosts.length) % featuredPosts.length)
    }

    const heroBadge = getHeroBadge(featuredPosts.length, activeHeroPost)
    const heroLink = activeHeroPost ? buildPostPath(activeHeroPost.slug, activeHeroPost.category?.slugPath) : '/archive'

    return (
        <div className="relative min-h-screen bg-paper font-body text-[color:var(--ink)]" style={paperThemeVars}>
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPatternStyle} />

            <section className="relative px-4 pb-14 pt-24 md:px-10">
                <div className="mx-auto max-w-6xl">
                    <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                                {brand.heroEyebrow}
                            </div>
                            <h1 className="text-[clamp(2.75rem,5vw,5rem)] font-display leading-[1.05]">
                                {brand.heroTitle}
                            </h1>
                            <p className="max-w-xl text-base leading-relaxed text-[color:var(--ink-muted)] first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-display first-letter:text-4xl first-letter:leading-none first-letter:text-[color:var(--accent)] md:text-lg">
                                {brand.heroDescription}
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
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs text-[color:var(--ink-muted)]">
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-3">
                                    <div className="text-lg font-semibold text-[color:var(--ink)]">
                                        {articleStats?.totalElements ?? 0}
                                    </div>
                                    <div>篇文章</div>
                                </div>
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-3">
                                    <div className="text-lg font-semibold text-[color:var(--ink)]">{categories.length}</div>
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
                                onMouseEnter={() => setCarouselPaused(true)}
                                onMouseLeave={() => setCarouselPaused(false)}
                                onFocusCapture={() => setCarouselPaused(true)}
                                onBlurCapture={() => setCarouselPaused(false)}
                            >
                                <div className="relative h-52 md:h-60">
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
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
                                    <div className="absolute left-5 top-5 rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700">
                                        {heroBadge}
                                    </div>
                                    {featuredPosts.length > 1 && (
                                        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-5">
                                            <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/90 backdrop-blur">
                                                {featuredIndex + 1} / {featuredPosts.length}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFeaturedStep(-1)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white transition-colors hover:bg-black/50"
                                                    aria-label="上一篇精选"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFeaturedStep(1)}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/35 text-white transition-colors hover:bg-black/50"
                                                    aria-label="下一篇精选"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 p-6">
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--ink-soft)]">
                                        <span>{activeHeroPost ? formatDate(activeHeroPost.publishedAt) : '持续更新中'}</span>
                                        {activeHeroPost?.category?.name && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-[color:var(--card-border)]" />
                                                <span>{activeHeroPost.category.name}</span>
                                            </>
                                        )}
                                        {featuredPosts.length > 1 && (
                                            <>
                                                <span className="h-1 w-1 rounded-full bg-[color:var(--card-border)]" />
                                                <span>自动切换间隔 6 秒</span>
                                            </>
                                        )}
                                    </div>

                                    <h3 className="text-2xl font-display text-[color:var(--ink)]">
                                        {activeHeroPost?.title ?? `欢迎来到 ${brand.heroTitle}`}
                                    </h3>
                                    <p className="line-clamp-3 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                        {activeHeroPost?.summary ?? '在设计、代码和旅行之间，持续整理值得留下的观察与方法。'}
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {(activeHeroPost?.tags ?? []).slice(0, 3).map((tag) => (
                                            <span
                                                key={tag.name}
                                                className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-3 py-1 text-xs text-[color:var(--ink-muted)]"
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        <Link
                                            to={heroLink}
                                            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                                        >
                                            {activeHeroPost ? '阅读全文' : '进入归档'}
                                            <ArrowUpRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>

                                    {featuredPosts.length > 1 && (
                                        <div className="flex items-center gap-2 pt-1">
                                            {featuredPosts.map((post, index) => (
                                                <button
                                                    key={post.id}
                                                    type="button"
                                                    onClick={() => setFeaturedIndex(index)}
                                                    className={`h-2.5 rounded-full transition-all ${
                                                        featuredIndex === index
                                                            ? 'w-8 bg-[color:var(--accent)]'
                                                            : 'w-2.5 bg-[color:var(--card-border)] hover:bg-[color:var(--ink-soft)]'
                                                    }`}
                                                    aria-label={`切换到第 ${index + 1} 篇精选`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                                待阅清单
                                            </p>
                                            <h3 className="mt-1 text-lg font-display text-[color:var(--ink)]">半星文章入口</h3>
                                        </div>
                                        <div className="text-right text-xs text-[color:var(--ink-soft)]">
                                            <div>{readingQueuePosts.length} 篇</div>
                                            <div>
                                                第 {Math.min(readingQueuePage + 1, readingQueueTotalPages)} / {readingQueueTotalPages} 页
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {loadingReadingQueue ? (
                                            <p className="text-sm text-[color:var(--ink-muted)]">正在加载待阅文章...</p>
                                        ) : visibleReadingQueuePosts.length ? (
                                            visibleReadingQueuePosts.map((post, index) => (
                                                <Link
                                                    key={post.id}
                                                    to={buildPostPath(post.slug, post.category?.slugPath)}
                                                    className="group flex items-start gap-3 rounded-xl border border-[color:var(--card-border)] bg-white/70 p-3 transition-colors hover:border-[color:var(--accent)]/40"
                                                >
                                                    <span className="pt-0.5 text-xs font-semibold text-[color:var(--ink-soft)]">
                                                        {String(readingQueuePage * READING_QUEUE_PAGE_SIZE + index + 1).padStart(2, '0')}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-1 text-sm font-semibold text-[color:var(--ink)] transition-colors group-hover:text-[color:var(--accent)]">
                                                            {post.title}
                                                        </p>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--ink-muted)]">
                                                            <span>{formatDate(post.publishedAt)}</span>
                                                            {post.category?.name && (
                                                                <>
                                                                    <span className="h-1 w-1 rounded-full bg-[color:var(--card-border)]" />
                                                                    <span>{post.category.name}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))
                                        ) : (
                                            <p className="text-sm text-[color:var(--ink-muted)]">暂无待阅文章。</p>
                                        )}
                                    </div>
                                    {readingQueuePosts.length > READING_QUEUE_PAGE_SIZE && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setReadingQueuePage((current) => Math.max(0, current - 1))}
                                                disabled={readingQueuePage === 0}
                                                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[color:var(--card-border)] px-3 py-2 text-xs font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                                上一页
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setReadingQueuePage((current) => Math.min(readingQueueTotalPages - 1, current + 1))
                                                }
                                                disabled={readingQueuePage >= readingQueueTotalPages - 1}
                                                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[color:var(--card-border)] px-3 py-2 text-xs font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[color:var(--accent)]/40 hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
                                            >
                                                下一页
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                            <BookOpen className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                                归档浏览
                                            </p>
                                            <h3 className="text-lg font-display text-[color:var(--ink)]">分类分组 + 分页检索</h3>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                                        默认按分类展示每组前 6 篇文章，搜索或进入单分类后切换为分页列表，适合长期累积内容后的持续浏览。
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
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                        <div className="flex items-end justify-between border-b border-[color:var(--card-border)] pb-3">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--ink-soft)]">Collections</p>
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
                                    <AvatarImage src={profile.avatarUrl} />
                                    <AvatarFallback>{profile.initials}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Author</p>
                                    <h3 className="text-lg font-display text-[color:var(--ink)]">{profile.name}</h3>
                                    <p className="text-xs text-[color:var(--ink-muted)]">{profile.bio}</p>
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
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Tags</p>
                                <h3 className="text-lg font-display text-[color:var(--ink)]">关键词地图</h3>
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
                        <span className="text-xs text-[color:var(--ink-soft)]">固定展示最新 6 篇非精选内容</span>
                    </div>
                    <div className="mt-8">
                        {loadingLatest || (loadingFeatured && !featuredPosts.length) ? (
                            <p className="text-sm text-[color:var(--ink-muted)]">正在加载文章...</p>
                        ) : visibleLatestPosts.length ? (
                            <div className="grid items-start gap-6 md:grid-cols-2">
                                {visibleLatestPosts.map((post, index) => (
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
                                        variant="featuredCompact"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-10 text-center text-[color:var(--ink-muted)]">
                                <p>当前没有可展示的非精选文章。</p>
                                <Link
                                    to="/archive"
                                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                                >
                                    去归档里看看
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="relative px-4 pb-24 md:px-10">
                <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Writing</p>
                                <h3 className="text-lg font-display text-[color:var(--ink)]">写作方法</h3>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                            关注问题如何被拆解、验证和表达。文章不仅记录结论，也尽量保留方法、路径和失败经验。
                        </p>
                        <Link
                            to="/archive"
                            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]"
                        >
                            浏览文章
                            <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_50px_-40px_rgba(31,41,55,0.35)]">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--ink)] text-[color:var(--paper-soft)]">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">Contact</p>
                                <h3 className="text-lg font-display text-[color:var(--ink)]">合作与交流</h3>
                            </div>
                        </div>
                        <p className="mt-4 text-sm leading-relaxed text-[color:var(--ink-muted)]">
                            如果你想聊设计、写作结构、产品叙事或旅行观察，可以从这里找到联系入口。
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
