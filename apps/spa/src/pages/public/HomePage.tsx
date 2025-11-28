import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { PostCard } from "../../components/public/PostCard";
import { CategoryCard } from "../../components/public/CategoryCard";
import { SearchBar } from "../../components/public/SearchBar";
import { Tag, TagCloud } from "../../components/public/TagCloud";
import { Card, CardContent } from "@repo/ui/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/ui/avatar";
import { Separator } from "@repo/ui/components/ui/separator";
import { useHeroCarousel } from "../../hooks/useHeroCarousel";

// Mock data
const pinnedPost = {
    title: 'Markdown 模板',
    excerpt:
        'Markdown 标题语法：在标题前添加井号（#）即可，数量对应层级。例如，添加三个 # 创建三级标题。示例：# 一级标题 / ## 二级标题 / ### 三级标题。',
    slug: 'markdown-template',
    coverImage: 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=1200&q=80',
    tags: ['Markdown'],
    publishDate: '2023-10-08',
    readTime: '7分钟',
    views: '7.4k',
};

const categories = [
    {
        title: '教程',
        slug: 'tutorial',
        backgroundImage: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
    },
    {
        title: '大数据',
        slug: 'bigdata',
        backgroundImage: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
    },
];

const articleList = [
    {
        title: 'Flink-Sql',
        excerpt: '测试 flink-sql',
        slug: 'flink-sql',
        coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80',
        tags: ['Flink'],
        publishDate: '2024-10-22',
        readTime: '6分钟',
        views: '6.5k',
    },
    {
        title: 'Hello World',
        excerpt: '这是第一篇测试文章，用于演示卡片样式与布局效果。',
        slug: 'hello-world',
        coverImage: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=80',
        tags: ['测试'],
        publishDate: '2024-09-30',
        readTime: '3分钟',
        views: '10.2k',
    },
];

const mockTags: Tag[] = [
    { name: 'React', count: 15 },
    { name: 'TypeScript', count: 12 },
    { name: 'Node.js', count: 8 },
    { name: 'Tailwind', count: 10 },
    { name: 'Web 开发', count: 20 },
    { name: '后端', count: 7 },
    { name: '架构', count: 5 },
    { name: '设计', count: 9 },
];

export default function HomePage() {
    const { currentImage, currentImageIndex } = useHeroCarousel();

    return (
        <div className="relative min-h-screen bg-gray-50">
            {/* Hero Section */}
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
                                backgroundSize: "cover",
                                backgroundPosition: "center",
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
                    <p className="text-2xl text-white/90 drop-shadow-md">碎念随风</p>
                    <p className="text-base md:text-lg text-white/70 max-w-3xl mx-auto leading-relaxed">
                        人间纵有千难万阻，依旧想把一行行代码与思考化作微光，照亮前路。
                    </p>
                    <div className="pt-6">
                        <SearchBar />
                    </div>
                </motion.div>

                <div className="absolute top-20 right-16 w-28 h-28 bg-pink-400/25 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-10 left-16 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: "2s" }}
                />
            </section>

            {/* Wave Divider */}
            <div className="wave-divider">
                <svg viewBox="0 0 1200 160" preserveAspectRatio="none">
                    <path
                        d="M0,96l40-10.7C80,75,160,53,240,64s160,64,240,80,160,0,240-16,160-32,240-42.7C1040,74,1120,74,1160,74.7L1200,75v85H0Z"
                        className="shape-fill"
                    />
                </svg>
            </div>

            {/* Main Content */}
            <section className="relative bg-white -mt-8 rounded-t-[48px] shadow-[0_-30px_60px_-40px_rgba(0,0,0,0.45)]">
                <div className="container mx-auto px-4 md:px-6 py-16 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Left - Main Content (75% = 3 columns) */}
                        <div className="lg:col-span-3 space-y-10">
                            {/* Pinned Article */}
                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    置顶文章
                                </h2>
                                <PostCard {...pinnedPost} index={0} />
                            </div>

                            {/* Featured Categories */}
                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    精选分类
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {categories.map((category, index) => (
                                        <CategoryCard key={category.slug} {...category} index={index} />
                                    ))}
                                </div>
                            </div>

                            {/* Article List */}
                            <div>
                                <h2 className="text-xl text-gray-400 text-center mb-6 font-light tracking-wider">
                                    文章列表
                                </h2>
                                <div className="space-y-5">
                                    {articleList.map((post, index) => (
                                        <PostCard key={post.slug} {...post} index={index} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right - Sidebar (25% = 1 column) */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                {/* Personal Card */}
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
                                                    <div className="font-bold text-base">17</div>
                                                    <div className="text-muted-foreground">文章</div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">12</div>
                                                    <div className="text-muted-foreground">分类</div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-base">12</div>
                                                    <div className="text-muted-foreground">标签</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>

                                {/* About and Archive Buttons */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="space-y-2"
                                >
                                    <div className="rounded-2xl border border-slate-100 bg-white/90 shadow-md p-3 space-y-2">
                                        <Link to="/about" className="block">
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-pink-500/35 hover:-translate-y-0.5">
                                                <span>👤</span>
                                                <span>关于我</span>
                                            </button>
                                        </Link>
                                        <Link to="/archive" className="block">
                                            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all duration-300 hover:shadow-sky-500/35 hover:-translate-y-0.5">
                                                <span>📁</span>
                                                <span>文章归档</span>
                                            </button>
                                        </Link>
                                    </div>
                                </motion.div>

                                {/* Tags */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <Card className="card-hover border-0 shadow-lg">
                                        <CardContent className="pt-6">
                                            <h3 className="text-base font-bold mb-3">精选标签</h3>
                                            <Separator className="mb-3" />
                                            <TagCloud tags={mockTags} />
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
