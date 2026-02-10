import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '../../components/admin/StatCard'
import { Eye, FileText, MessageSquare, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { DashboardStats } from '../../types/api'

export default function DashboardPage() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
            return unwrapResponse(res.data)
        },
    })

    const statCards = [
        { title: '总浏览量', value: stats?.totalViews ?? 0, icon: Eye },
        { title: '文章数量', value: stats?.totalArticles ?? 0, icon: FileText },
        { title: '评论数量', value: stats?.totalComments ?? 0, icon: MessageSquare },
        { title: '订阅/用户', value: 0, icon: Users },
    ]

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-semibold font-display text-[color:var(--ink)] mb-2">仪表盘</h1>
                <p className="text-[color:var(--ink-muted)]">欢迎回来，这里是你的内容运营概览。</p>
            </motion.div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat, index) => (
                    <StatCard key={stat.title} {...stat} index={index} />
                ))}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
            >
                <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                    <CardHeader>
                        <CardTitle className="text-[color:var(--ink)]">热门文章</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && <p className="text-sm text-[color:var(--ink-soft)]">加载中...</p>}
                        {!isLoading && (
                            <div className="space-y-3">
                                {(stats?.topArticles ?? []).map((article) => (
                                    <div
                                        key={article.id}
                                        className="flex items-center justify-between border-b border-[color:var(--card-border)] pb-2 last:border-0 last:pb-0"
                                    >
                                        <span className="text-sm text-[color:var(--ink)]">{article.title}</span>
                                        <span className="text-xs text-[color:var(--ink-soft)]">{article.views} 次阅读</span>
                                    </div>
                                ))}
                                {!stats?.topArticles?.length && (
                                    <p className="text-sm text-[color:var(--ink-soft)]">暂无数据</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
