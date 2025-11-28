import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Info, FileText, Search } from 'lucide-react';
import { Button } from '@repo/ui/components/ui/button';
import clsx from 'clsx';

export default function PublicLayout() {
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="flex min-h-screen flex-col">
            <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/50 to-transparent text-white">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6">
                    <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-wide">
                        <span className="text-xl">✦</span>
                        <span>碎念随风</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                        <Link
                            to="/"
                            className={clsx(
                                'flex items-center gap-2 transition-colors',
                                isActive('/') ? 'text-white' : 'text-white/80 hover:text-white'
                            )}
                        >
                            <Home className="h-4 w-4" />
                            首页
                        </Link>
                        <Link
                            to="/about"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                        >
                            <Info className="h-4 w-4" />
                            关于
                        </Link>
                        <Link
                            to="/archive"
                            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                        >
                            <FileText className="h-4 w-4" />
                            文章
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <button
                            aria-label="搜索"
                            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors"
                        >
                            <Search className="h-4 w-4" />
                        </button>
                        <Link to="/admin/login">
                            <Button variant="secondary" size="sm" className="bg-white/90 text-slate-900 hover:bg-white">
                                后台管理
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="py-6 md:px-8 md:py-8 bg-white text-slate-600">
                <div className="container flex flex-col items-center justify-between gap-4 md:flex-row text-sm">
                    <p className="text-center md:text-left">由 Antigravity 提供技术支持</p>
                </div>
            </footer>
        </div>
    );
}
