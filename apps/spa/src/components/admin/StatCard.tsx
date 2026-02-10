import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { LucideIcon } from 'lucide-react'

export interface StatCardProps {
    title: string
    value: number
    icon: LucideIcon
    trend?: number
    index?: number
}

export function StatCard({ title, value, icon: Icon, trend, index = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Card className="relative overflow-hidden border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_22px_45px_-38px_rgba(31,41,55,0.35)]">
                <div className="absolute top-0 right-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-[color:var(--paper-strong)]" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-[color:var(--ink-muted)]">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-[color:var(--accent)]" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-semibold text-[color:var(--ink)]">
                        {value.toLocaleString()}
                    </div>
                    {trend !== undefined && (
                        <p className={`text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {trend >= 0 ? '+' : ''}{trend}% 较上月
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
