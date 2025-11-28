import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
    title: string;
    value: number;
    icon: LucideIcon;
    trend?: number;
    index?: number;
}

export function StatCard({ title, value, icon: Icon, trend, index = 0 }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
        >
            <Card className="card-hover relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-gradient-primary opacity-10" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold gradient-text">
                        {value.toLocaleString()}
                    </div>
                    {trend !== undefined && (
                        <p className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend >= 0 ? '+' : ''}{trend}% from last month
                        </p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}
