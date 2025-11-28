import { motion } from 'framer-motion';
import { StatCard } from '../../components/admin/StatCard';
import { Eye, FileText, MessageSquare, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';

export default function DashboardPage() {
    const stats = [
        { title: '总浏览量', value: 12543, icon: Eye, trend: 12.5 },
        { title: '文章数', value: 48, icon: FileText, trend: 8.2 },
        { title: '评论数', value: 326, icon: MessageSquare, trend: -2.4 },
        { title: '订阅者', value: 1205, icon: Users, trend: 15.3 },
    ];

    return (
        <div className="space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-4xl font-bold gradient-text mb-2">仪表盘</h1>
                <p className="text-muted-foreground">欢迎回来！这是您的数据概览。</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <StatCard key={stat.title} {...stat} index={index} />
                ))}
            </div>

            {/* Recent Activity */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                <Card className="card-hover">
                    <CardHeader>
                        <CardTitle>最近活动</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { action: '《React 入门》收到新评论', time: '5 分钟前' },
                                { action: '文章《Tailwind 技巧》已发布', time: '2 小时前' },
                                { action: '新增订阅者', time: '1 天前' },
                            ].map((activity, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                                    className="flex items-center justify-between pb-4 border-b last:border-0"
                                >
                                    <p className="text-sm">{activity.action}</p>
                                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
