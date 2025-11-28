import { Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

export default function AdminLayout() {
    const { token } = useAuthStore()

    // Simple auth check
    if (!token) {
        // For development, we might want to bypass this or have a mock login
        // return <Navigate to="/admin/login" replace />
    }

    return (
        <div className="flex min-h-screen flex-col space-y-6">
            <header className="sticky top-0 z-40 border-b bg-background">
                <div className="container flex h-16 items-center justify-between py-4">
                    <div className="font-bold">管理后台</div>
                </div>
            </header>
            <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
                <aside className="hidden w-[200px] flex-col md:flex">
                    <nav className="grid items-start gap-2">
                        <span className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                            仪表盘
                        </span>
                        <span className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                            文章管理
                        </span>
                        <span className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                            设置
                        </span>
                    </nav>
                </aside>
                <main className="flex w-full flex-1 flex-col overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
