import { useMemo, type CSSProperties } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { Home, Info, FileText, Search, Map, Sparkles } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
import clsx from 'clsx'

export default function PublicLayout() {
    const location = useLocation()
    const isActive = (path: string) => location.pathname === path

    const isArticlePage = location.pathname.startsWith('/post')
    const themeStyles = useMemo(
        () =>
            ({
                '--paper': '#f6f1e7',
                '--paper-soft': '#fbf8f2',
                '--paper-strong': '#efe6d7',
                '--ink': '#1f2933',
                '--ink-muted': '#6b6157',
                '--ink-soft': '#8a8076',
                '--accent': '#b45309',
                '--teal': '#0f766e',
                '--card-border': '#e3d8c8',
                '--shadow-soft': '0 32px 60px -44px rgba(31, 41, 55, 0.35)',
                '--font-display': '"Libre Bodoni", "Noto Serif SC", "Source Han Serif SC", "Songti SC", "SimSun", "Times New Roman", serif',
                '--font-body': '"Public Sans", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
            }) as CSSProperties,
        []
    )

    return (
        <div className="flex min-h-screen flex-col" style={themeStyles}>
            {!isArticlePage && (
                <header className="fixed top-4 left-0 right-0 z-50">
                    <div className="container flex h-14 items-center justify-between rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/90 px-4 md:px-6 shadow-sm backdrop-blur text-[color:var(--ink)]">
                        <Link to="/" className="flex items-center gap-2 text-sm font-semibold tracking-[0.3em] uppercase font-display">
                            <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
                            <span>碎念随风</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[color:var(--ink-muted)]">
                            <Link
                                to="/"
                                className={clsx(
                                    'flex items-center gap-2 transition-colors',
                                    isActive('/') ? 'text-[color:var(--ink)]' : 'hover:text-[color:var(--ink)]'
                                )}
                            >
                                <Home className="h-4 w-4" />
                                首页
                            </Link>
                            <Link
                                to="/about"
                                className={clsx(
                                    'flex items-center gap-2 transition-colors',
                                    isActive('/about') ? 'text-[color:var(--ink)]' : 'hover:text-[color:var(--ink)]'
                                )}
                            >
                                <Info className="h-4 w-4" />
                                关于
                            </Link>
                            <Link
                                to="/archive"
                                className={clsx(
                                    'flex items-center gap-2 transition-colors',
                                    isActive('/archive') ? 'text-[color:var(--ink)]' : 'hover:text-[color:var(--ink)]'
                                )}
                            >
                                <FileText className="h-4 w-4" />
                                文章
                            </Link>
                            <Link
                                to="/footprint"
                                className={clsx(
                                    'flex items-center gap-2 transition-colors',
                                    isActive('/footprint') ? 'text-[color:var(--ink)]' : 'hover:text-[color:var(--ink)]'
                                )}
                            >
                                <Map className="h-4 w-4" />
                                足迹
                            </Link>
                        </nav>

                        <div className="flex items-center gap-3">
                            <button
                                aria-label="搜索"
                                className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] text-[color:var(--ink-muted)] hover:bg-white transition-colors"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            <Link to="/admin/login">
                                <Button variant="secondary" size="sm" className="bg-[color:var(--ink)] text-[color:var(--paper-soft)] hover:bg-black">
                                    后台管理
                                </Button>
                            </Link>
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-1">
                <Outlet />
            </main>

            <footer className="py-8 md:px-8 md:py-10 bg-transparent text-[color:var(--ink-muted)] border-t border-[color:var(--card-border)]">
                <div className="container flex flex-col items-center justify-between gap-4 md:flex-row text-sm">
                    <p className="text-center md:text-left">© Antigravity 提供技术支持</p>
                </div>
            </footer>
        </div>
    )
}
