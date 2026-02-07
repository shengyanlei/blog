import { motion } from 'framer-motion';
import { Input } from '@repo/ui/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import clsx from 'clsx';

type SearchBarTone = 'light' | 'dark' | 'paper';

interface SearchBarProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    className?: string;
    tone?: SearchBarTone;
}

export function SearchBar({
    value,
    placeholder = '搜索文章...',
    onChange,
    onSubmit,
    className,
    tone = 'dark',
}: SearchBarProps) {
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.();
    };

    const isLight = tone === 'light';
    const isPaper = tone === 'paper';

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={clsx('w-full max-w-2xl', className)}
        >
            <form onSubmit={handleSearch} className="relative">
                <div
                    className={clsx(
                        'rounded-full border p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] backdrop-blur transition-colors',
                        isPaper
                            ? 'border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/90 focus-within:border-[color:var(--accent)]/50'
                            : isLight
                                ? 'border-slate-200/80 bg-white/80 focus-within:border-[color:var(--accent)]/40'
                                : 'border-white/15 bg-white/10 focus-within:border-white/30'
                    )}
                >
                    <div className="flex items-center gap-2">
                        <Search
                            className={clsx(
                                'ml-3 h-5 w-5',
                                isPaper ? 'text-[color:var(--ink-soft)]' : isLight ? 'text-slate-500' : 'text-white/70'
                            )}
                        />
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className={clsx(
                                'border-0 bg-transparent shadow-none focus-visible:ring-0 text-base',
                                isPaper
                                    ? 'text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)]'
                                    : isLight
                                        ? 'text-slate-900 placeholder:text-slate-400'
                                        : 'text-white placeholder:text-white/50'
                            )}
                        />
                        {value && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onChange('')}
                                className={clsx(
                                    'mr-1 h-8 w-8 rounded-full',
                                    isPaper
                                        ? 'text-[color:var(--ink-soft)] hover:bg-[color:var(--paper-strong)]'
                                        : isLight
                                            ? 'text-slate-500 hover:bg-slate-100'
                                            : 'text-white/70 hover:bg-white/10'
                                )}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </motion.div>
    );
}
