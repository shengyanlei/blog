import { motion } from 'framer-motion';
import { Badge } from '@repo/ui/components/ui/badge';

export interface Tag {
    name: string;
    count: number;
}

export interface TagCloudProps {
    tags: Tag[];
}

export function TagCloud({ tags }: TagCloudProps) {
    if (!tags.length) {
        return <p className="text-sm text-muted-foreground">暂无标签</p>;
    }

    const maxCount = Math.max(...tags.map((t) => t.count), 1);

    const getFontSize = (count: number) => {
        const ratio = count / maxCount;
        return `${0.9 + ratio * 0.45}rem`; // 14.4px to ~22px
    };

    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
                <motion.div
                    key={tag.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.08 }}
                >
                    <Badge
                        variant="secondary"
                        className="cursor-pointer transition-all rounded-full bg-slate-50 text-slate-700 border border-slate-100 shadow-sm hover:-translate-y-0.5 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700"
                        style={{ fontSize: getFontSize(tag.count), paddingInline: '0.65rem', paddingBlock: '0.35rem' }}
                    >
                        {tag.name}
                        <span className="ml-1 text-xs opacity-70">({tag.count})</span>
                    </Badge>
                </motion.div>
            ))}
        </div>
    );
}
