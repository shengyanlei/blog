import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
    theme: 'light' | 'dark' | 'system'
    setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'system',
            setTheme: (theme) => {
                const root = window.document.documentElement
                root.classList.remove('light', 'dark')

                if (theme === 'system') {
                    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark'
                        : 'light'
                    root.classList.add(systemTheme)
                } else {
                    root.classList.add(theme)
                }
                set({ theme })
            },
        }),
        {
            name: 'theme-storage',
        }
    )
)
