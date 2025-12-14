import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { useAuthStore } from '../../store/useAuthStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { AuthResponse } from '../../types/api'

export default function LoginPage() {
    const login = useAuthStore((state) => state.login)
    const navigate = useNavigate()
    const location = useLocation()
    const [username, setUsername] = useState('admin')
    const [password, setPassword] = useState('admin123')

    const loginMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password })
            return unwrapResponse(res.data)
        },
        onSuccess: (data) => {
            login(data.token, data.user)
            const redirect = (location.state as any)?.from?.pathname ?? '/admin/dashboard'
            navigate(redirect, { replace: true })
        },
        onError: () => {
            alert('登录失败，请检查账号或密码')
        },
    })

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        loginMutation.mutate()
    }

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 gradient-hero animate-gradient" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

            <div className="absolute top-20 right-20 w-72 h-72 gradient-accent rounded-full blur-3xl opacity-30 animate-float" />
            <div className="absolute bottom-20 left-20 w-96 h-96 gradient-success rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '3s' }} />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md px-4"
            >
                <Card className="glass border-white/20 backdrop-blur-xl">
                    <CardContent className="pt-6">
                        <div className="mb-8 text-center">
                            <h1 className="text-3xl font-bold mb-2 text-white">欢迎回来</h1>
                            <p className="text-white/70">登录以访问管理后台</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">用户名</label>
                                <Input
                                    type="text"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">密码</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-white text-purple-600 hover:bg-white/90 transition-all"
                                size="lg"
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                        登录中...
                                    </span>
                                ) : (
                                    '登录'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-white/60">演示账号：用户名 admin / 密码 admin123</p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
