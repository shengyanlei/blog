import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'

export default function RootLayout() {
    const { theme, setTheme } = useThemeStore()

    useEffect(() => {
        setTheme(theme)
    }, [theme, setTheme])

    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <Outlet />
        </div>
    )
}
