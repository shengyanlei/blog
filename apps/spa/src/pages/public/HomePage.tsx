import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PostCard } from '../../components/public/PostCard'
import { CategoryCard } from '../../components/public/CategoryCard'
import { SearchBar } from '../../components/public/SearchBar'
import { TagCloud } from '../../components/public/TagCloud'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar'
import { Separator } from '@repo/ui/components/ui/separator'
import { useHeroCarousel } from '../../hooks/useHeroCarousel'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleSummary, Category, Tag as TagDto, PageResult } from '../../types/api'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop&sig=${seed}`

export default function HomePage() {
    const { currentImage, currentImageIndex } = useHeroCarousel()
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
                    size: 10,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const articles = articlePage?.content ?? []
    const pinnedPost = articles[0]
    const otherArticles = articles.slice(1)

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
        <div className="relative min-h-screen bg-gray-50">
            <section className="relative min-h-[70vh] text-white pt-24 pb-16 px-4 md:px-10 overflow-hidden flex items-center">
                <div className="absolute inset-0 z-0">
                    <AnimatePresence initial={false}>
                        <motion.div
                            key={currentImageIndex}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 2, ease: [0.43, 0.13, 0.23, 0.96] }}
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `url(${currentImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/75 via-slate-900/45 to-slate-900/80 backdrop-blur-[1px]" />
                        </motion.div>
                    </AnimatePresence>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="container relative z-10 max-w-4xl text-center space-y-4"
                >
                    <p className="text-sm uppercase tracking-[0.3em] text-white/70">Personal Blog</p>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-wide drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                        碎念随风
                    </h1>
                    <p className="text-2xl text-white/90 drop-shadow-md max-w-4xl mx-auto leading-relaxed">
                        人海未见之时，我亦独行在这城市。 料峭，春醒，酷暑，骤雨，寒意四起，大雁南飞，而后，大雪，寒风， 斗转星移，人间寒暑。
                    </p>
                    <div className="pt-6">
                        <SearchBar value={keyword} onChange={setKeyword} onSubmit={handleSearch} />
                    </div>
                </motion.div>

                <div className="absolute top-20 right-16 w-28 h-28 bg-pink-400/25 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-10 left-16 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: '2s' }}
                />
            </section>

            <div className="wave-divider">
                <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
                    <path
                        d="M0,96l40-10.7C80,75,160,53,240,64s160,64,240,80,160,0,240-16,160-32,240-42.7C1040,74,1120,74,1160,74.7L1200,75v85H0Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            <section className="relative bg-white -mt-8 rounded-t-[48px] shadow-[0_-30px_60px_-40px_rgba(0,0,0,0.45)]">
                <div className="container mx-auto px-4 md:px-6 py-16 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        <div className="lg:col-span-3 space-y-10">
                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    置顶文章
                                </h2>
                                {loadingArticles ? (
                                    <p className="text-center text-muted-foreground">加载中...</p>
                                ) : pinnedPost ? (
                                    <PostCard
                                        id={pinnedPost.id}
                                        title={pinnedPost.title}
                                        excerpt={pinnedPost.summary}
                                        slug={pinnedPost.slug}
                                        categorySlugPath={pinnedPost.category?.slugPath}
                                        coverImage={coverImageFor(pinnedPost.id)}
                                        tags={pinnedPost.tags?.map((t) => t.name)}
                                        publishDate={pinnedPost.publishedAt}
                                        views={pinnedPost.views}
                                        index={0}
                                    />
                                ) : (
                                    <p className="text-center text-muted-foreground">暂无文章</p>
                                )}
                            </div>

                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    精选分类
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    文章列表
                                </h2>
                                {loadingArticles ? (
                                    <p className="text-center text-muted-foreground">加载中...</p>
                                ) : (
                                    <div className="space-y-5">
                                        {otherArticles.map((post, index) => (
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
                                        {!otherArticles.length && pinnedPost && (
                                            <p className="text-center text-muted-foreground">仅有一篇置顶文章</p>
                                        )}
                                        {!articles.length && !loadingArticles && (
                                            <p className="text-center text-muted-foreground">暂无文章，稍后再来。</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <Card className="text-center card-hover border-0 shadow-lg">
                                        <CardContent className="pt-6">
                                            <Avatar className="w-20 h-20 mx-auto mb-3">
                                                <AvatarImage src="https://avatars.githubusercontent.com/u/1?v=4" />
                                                <AvatarFallback>SY</AvatarFallback>
                                            </Avatar>
                                            <h3 className="text-lg font-bold mb-2">shyl</h3>
                                            <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
                                                人海未见之时，我亦独行在这座城市。料峭春寒，簌簌骤雨，寒意四起，大雁南飞，路还长。
                                            </p>
                                            <div className="flex justify-center gap-6 text-xs">
                                                <div>
                                                    <div className="font-bold text-base">{articlePage?.totalElements ?? 0}</div>
                                                    <div className="text-muted-foreground">文章</div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">{categories.length}</div>
                                                    <div className="text-muted-foreground">分类</div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">{tags.length}</div>
                                                    <div className="text-muted-foreground">标签</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="space-y-2"
                                >
                                    <div className="rounded-2xl border border-slate-100 bg-white/90 shadow-md p-3 space-y-2">
                                        <Link to="/about" className="block">
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-pink-500/35 hover:-translate-y-0.5">
                                                <span>💬</span>
                                                <span>关于我</span>
                                            </button>
                                        </Link>
                                        <Link to="/archive" className="block">
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all duration-300 hover:shadow-sky-500/35 hover:-translate-y-0.5">
                                                <span>📚</span>
                                                <span>文章归档</span>
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Card className="card-hover border-0 shadow-lg">
                                        <CardContent className="pt-6">
                                            <h3 className="text-base font-bold mb-3">精选标签</h3>
                                            <Separator className="mb-3" />
                                            <TagCloud tags={tagCloud} />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
