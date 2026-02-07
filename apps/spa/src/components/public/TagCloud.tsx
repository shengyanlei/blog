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
        return <p className="text-sm text-[color:var(--ink-muted)]">暂无标签</p>;
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
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                    <Badge
                        variant="secondary"
                        className="cursor-pointer transition-colors rounded-full bg-[color:var(--paper-soft)] text-[color:var(--ink-muted)] border border-[color:var(--card-border)] shadow-sm hover:border-[color:var(--accent)]/40 hover:bg-white hover:text-[color:var(--accent)]"
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
