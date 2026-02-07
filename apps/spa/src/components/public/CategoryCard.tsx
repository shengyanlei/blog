import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export interface CategoryCardProps {
    id: number
    name: string
    description?: string
    index?: number
}

export function CategoryCard({ id, name, description, index = 0 }: CategoryCardProps) {
    const shouldReduceMotion = useReducedMotion()
    const order = String(index + 1).padStart(2, '0')
    return (
        <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, delay: index * 0.15 }}
        >
            <Link to={`/?categoryId=${id}`}>
                <div className="group relative flex h-52 flex-col justify-between overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_25px_55px_-45px_rgba(31,41,55,0.35)] transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]/40">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(180,83,9,0.15),transparent_45%),radial-gradient(circle_at_90%_0%,rgba(15,118,110,0.12),transparent_40%)]" />
                    <div className="absolute right-5 top-4 text-5xl font-display text-[color:var(--ink-soft)]/30">
                        {order}
                    </div>
                    <div className="relative z-10 space-y-3">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                            分类
                        </p>
                        <h3 className="text-2xl font-display text-[color:var(--ink)] transition-colors group-hover:text-[color:var(--accent)]">
                            {name}
                        </h3>
                        {description && (
                            <p className="text-sm text-[color:var(--ink-muted)] line-clamp-2">{description}</p>
                        )}
                    </div>
                    <span className="relative z-10 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--accent)]">
                        探索主题
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </Link>
        </motion.div>
    )
}
