import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { useAuthStore } from '../../store/useAuthStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { AuthResponse } from '../../types/api'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'
import { firstAccessibleAdminPath } from '../../constants/adminTabs'

export default function LoginPage() {
    const login = useAuthStore((state) => state.login)
    const navigate = useNavigate()
    const location = useLocation()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    const loginMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                username: username.trim(),
                password: password.trim(),
            }
            const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: (data) => {
            login(data.token, data.user)
            const fallbackPath = firstAccessibleAdminPath(data.user) || '/admin/dashboard'
            const redirect = (location.state as any)?.from?.pathname ?? fallbackPath
            navigate(redirect, { replace: true })
        },
        onError: (error) => {
            if (isAxiosError(error)) {
                const message = (error.response?.data as { message?: string } | undefined)?.message
                if (message && message.trim()) {
                    alert(message)
                    return
                }
                if (error.response?.status === 401) {
                    alert('用户名或密码错误')
                    return
                }
            }
            alert('登录失败，请稍后重试')
        },
    })

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            alert('请输入用户名和密码')
            return
        }
        loginMutation.mutate()
    }

    return (
        <div
            className="relative min-h-screen flex items-center justify-center bg-[color:var(--paper)] px-4 font-body"
            style={paperThemeVars}
        >
            <div
                className="pointer-events-none absolute inset-0 opacity-70"
                style={paperPatternStyle}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md"
            >
                <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_30px_60px_-45px_rgba(31,41,55,0.4)]">
                    <CardContent className="pt-6">
                        <div className="mb-8">
                            <h1 className="text-3xl font-semibold font-display text-[color:var(--ink)] mb-2">欢迎回来</h1>
                            <p className="text-sm text-[color:var(--ink-muted)]">登录以进入管理后台</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[color:var(--ink)]">用户名</label>
                                <Input
                                    type="text"
                                    placeholder="请输入用户名"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus-visible:ring-[color:var(--accent)]/30"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[color:var(--ink)]">密码</label>
                                <Input
                                    type="password"
                                    placeholder="请输入密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus-visible:ring-[color:var(--accent)]/30"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[color:var(--accent)] hover:bg-[#92400e] text-white shadow-sm"
                                size="lg"
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                                        登录中...
                                    </span>
                                ) : (
                                    '登录'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
