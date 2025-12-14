import { motion } from 'framer-motion';
import { Input } from '@repo/ui/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';

interface SearchBarProps {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
}

export function SearchBar({ value, placeholder = '搜索文章...', onChange, onSubmit }: SearchBarProps) {
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit?.();
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl mx-auto"
        >
            <form onSubmit={handleSearch} className="relative">
                <div className="glass dark:glass-dark rounded-lg p-1">
                    <div className="flex items-center gap-2">
                        <Search className="ml-3 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base"
                        />
                        {value && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onChange('')}
                                className="mr-1 h-8 w-8"
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
