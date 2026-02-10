import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { LayoutDashboard, FileText, Settings, Pencil, Tag, MessageSquare, Upload, MapPinned } from 'lucide-react'
import { paperThemeVars } from '../lib/theme'

export default function AdminLayout() {
    const { token } = useAuthStore()
    const location = useLocation()

    if (!token) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />
    }

    const navItems = [
        { to: '/admin/dashboard', label: '仪表盘', icon: LayoutDashboard },
        { to: '/admin/articles', label: '文章管理', icon: FileText },
        { to: '/admin/write', label: '写文章', icon: Pencil },
        { to: '/admin/upload', label: '上传文章', icon: Upload },
        { to: '/admin/comments', label: '评论管理', icon: MessageSquare },
        { to: '/admin/tags', label: '标签管理', icon: Tag },
        { to: '/admin/categories', label: '分类管理', icon: FileText },
        { to: '/admin/footprints', label: '足迹管理', icon: MapPinned },
        { to: '/admin/settings', label: '设置', icon: Settings, disabled: true },
    ]

    return (
        <div
            className="flex min-h-screen flex-col bg-[color:var(--paper)] text-[color:var(--ink)] font-body"
            style={paperThemeVars}
        >
            <header className="sticky top-0 z-40 border-b border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/90 backdrop-blur">
                <div className="flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold font-display tracking-[0.2em] uppercase">管理后台</span>
                        <span className="hidden md:inline text-xs text-[color:var(--ink-soft)]">Blog Control Center</span>
                    </div>
                </div>
            </header>
            <div className="flex flex-1">
                <aside className="hidden md:flex w-60 flex-col border-r border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-4 py-6">
                    <nav className="grid items-start gap-2">
                        {navItems.map(({ to, label, icon: Icon, disabled }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    [
                                        'group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-[color:var(--paper-strong)] text-[color:var(--ink)]'
                                            : 'text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-strong)] hover:text-[color:var(--ink)]',
                                        disabled ? 'opacity-60 pointer-events-none' : '',
                                    ].join(' ')
                                }
                            >
                                <Icon className="mr-2 h-4 w-4 text-[color:var(--ink-soft)] group-hover:text-[color:var(--accent)]" />
                                {label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden px-6 pb-10 pt-6">
                    <div className="mx-auto w-full max-w-6xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
