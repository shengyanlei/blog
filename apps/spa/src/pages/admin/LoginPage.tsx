import { motion } from 'framer-motion';
import { Card, CardContent } from '@repo/ui/components/ui/card';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function LoginPage() {
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        login('mock-token', { name: 'Admin' });
        navigate('/admin/dashboard');
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 gradient-hero animate-gradient" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />

            {/* Floating Circles */}
            <div className="absolute top-20 right-20 w-72 h-72 gradient-accent rounded-full blur-3xl opacity-30 animate-float" />
            <div className="absolute bottom-20 left-20 w-96 h-96 gradient-success rounded-full blur-3xl opacity-30 animate-float" style={{ animationDelay: '3s' }} />

            {/* Login Card */}
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
                            <p className="text-white/70">登录以访问您的管理面板</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">邮箱</label>
                                <Input
                                    type="email"
                                    placeholder="admin@example.com"
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">密码</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/50"
                                    required
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-white text-purple-600 hover:bg-white/90 transition-all"
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? (
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
                            <p className="text-sm text-white/60">
                                演示账号：任意邮箱/密码
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
