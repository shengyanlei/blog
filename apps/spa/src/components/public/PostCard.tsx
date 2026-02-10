import { motion, useReducedMotion } from 'framer-motion'
import { Card } from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { ArrowUpRight, Calendar, Eye, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buildPostPath } from '../../lib/postPath'

export interface PostCardProps {
    id: number
    title: string
    excerpt?: string
    slug: string
    categorySlugPath?: string
    coverImage?: string
    tags?: string[]
    publishDate?: string
    readTime?: string
    views?: number
    index?: number
}

export function PostCard({
    title,
    excerpt,
    slug,
    categorySlugPath,
    coverImage,
    tags = [],
    publishDate,
    readTime,
    views,
    index = 0,
}: PostCardProps) {
    const formattedDate = publishDate ? new Date(publishDate).toLocaleDateString() : '未知日期'
    const safeExcerpt = excerpt || '这篇文章还没有摘要，点击卡片查看详情。'
    const hasImage = Boolean(coverImage)
    const shouldReduceMotion = useReducedMotion()
    const order = String(index + 1).padStart(2, '0')

    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.1 }}
        >
            <Card className="group h-full overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-0 shadow-[0_30px_60px_-48px_rgba(31,41,55,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]/40">
                <Link to={buildPostPath(slug, categorySlugPath)} className="flex h-full flex-col">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                        {hasImage ? (
                            <img
                                src={coverImage}
                                alt={title}
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                        <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700">
                            Issue {order}
                        </div>
                    </div>

                    <div className="flex h-full flex-col gap-4 p-6">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-[color:var(--ink-soft)]">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                                {formattedDate}
                            </span>
                            {views !== undefined && (
                                <span className="flex items-center gap-1.5">
                                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    {views} 次阅读
                                </span>
                            )}
                            {readTime && (
                                <span className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                                    {readTime}
                                </span>
                            )}
                        </div>

                        <h3 className="text-2xl font-display text-[color:var(--ink)] leading-snug transition-colors group-hover:text-[color:var(--accent)] line-clamp-2">
                            {title}
                        </h3>

                        <p className="text-sm text-[color:var(--ink-muted)] line-clamp-3 leading-relaxed">{safeExcerpt}</p>

                        <div className="mt-auto flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap gap-1.5">
                                {tags.slice(0, 3).map((tag) => (
                                    <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="bg-[color:var(--paper-strong)] text-[color:var(--ink-muted)] border border-[color:var(--card-border)] transition-colors text-xs px-2.5 py-1 rounded-full hover:border-[color:var(--accent)]/30 hover:text-[color:var(--accent)]"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]">
                                阅读文章
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </span>
                        </div>
                    </div>
                </Link>
            </Card>
        </motion.div>
    )
}
