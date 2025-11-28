import { motion } from 'framer-motion';
import { Card } from '@repo/ui/components/ui/card';
import { Badge } from '@repo/ui/components/ui/badge';
import { Calendar, Eye, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface PostCardProps {
    title: string;
    excerpt: string;
    slug: string;
    coverImage?: string;
    tags?: string[];
    publishDate: string;
    readTime?: string;
    views?: string;
    index?: number;
}

export function PostCard({
    title,
    excerpt,
    slug,
    coverImage,
    tags = [],
    publishDate,
    readTime,
    views,
    index = 0,
}: PostCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Card className="group overflow-hidden border-0 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.45)] bg-white rounded-2xl p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_25px_70px_-35px_rgba(0,0,0,0.55)]">
                <Link to={`/post/${slug}`} className="flex flex-col md:flex-row h-full group/card">
                    {/* 左侧 - 封面图，占一半宽度 */}
                    {coverImage && (
                        <div className="relative w-full md:w-1/2 min-h-52 md:min-h-[220px] overflow-hidden">
                            <img
                                src={coverImage}
                                alt={title}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 md:clip-slant-right group-hover/card:scale-[1.03] group-hover/card:rotate-[1.5deg]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/10 to-transparent md:clip-slant-right" />
                        </div>
                    )}

                    {/* 右侧 - 内容，占一半宽度 */}
                    <div className="w-full md:w-1/2 p-5 md:p-6 flex flex-col justify-between gap-3 transition-transform duration-500 group-hover/card:translate-x-1">
                        {/* 元数据 */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                                {publishDate}
                            </span>
                            {views && (
                                <span className="flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    {views}次阅读
                                </span>
                            )}
                            {readTime && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    {readTime}
                                </span>
                            )}
                        </div>

                        {/* 标题 */}
                        <h3 className="text-[22px] font-semibold text-pink-500 leading-snug transition-colors group-hover:text-pink-600 line-clamp-1">
                            {title}
                        </h3>

                        {/* 摘要 */}
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                            {excerpt}
                        </p>

                        {/* 底部 - 标签和按钮 */}
                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="bg-slate-100 text-slate-700 hover:bg-pink-50 hover:text-pink-700 transition-colors text-xs px-2.5 py-1 rounded-full"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <button className="px-4 py-2 text-xs font-medium text-white rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 shadow-lg shadow-pink-500/20 transition-all duration-300 hover:shadow-pink-500/35 hover:-translate-y-0.5">
                                more...
                            </button>
                        </div>
                    </div>
                </Link>
            </Card>
        </motion.div>
    );
}
