import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { isAxiosError } from 'axios'
import { getAdminProfile, getAdminSiteConfig, updateAdminPassword, updateAdminSiteConfig } from '../../lib/api'
import { useAuthStore } from '../../store/useAuthStore'
import type { SiteConfig } from '../../config/siteConfig'
import type { AdminSiteConfigResponse, UpdatePasswordRequest } from '../../types/api'
import { useNavigate } from 'react-router-dom'

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const textAreaClass =
    'w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-3 py-2 text-sm text-[color:var(--ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/20'

const formatTime = (iso?: string | null) => {
    if (!iso) return '-'
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('zh-CN', { hour12: false })
}

const extractErrorMessage = (error: unknown, fallback: string) => {
    if (isAxiosError(error)) {
        const message = (error.response?.data as { message?: string } | undefined)?.message
        if (message && message.trim()) return message
    }
    if (error instanceof Error && error.message.trim()) return error.message
    return fallback
}

const validateConfig = (config: SiteConfig) => {
    const strings = [
        config.site.meta.title,
        config.site.meta.subtitle,
        config.site.brand.navName,
        config.site.brand.heroEyebrow,
        config.site.brand.heroTitle,
        config.site.brand.heroDescription,
        config.site.brand.footerText,
        config.site.brand.navLabels.home,
        config.site.brand.navLabels.about,
        config.site.brand.navLabels.archive,
        config.site.brand.navLabels.admin,
        config.site.profile.name,
        config.site.profile.initials,
        config.site.profile.role,
        config.site.profile.bio,
        config.site.profile.location,
        config.site.profile.expertise,
        config.site.profile.email,
        config.site.profile.avatarUrl,
        config.about.heading,
        config.about.intro,
        config.about.ctaArchive,
        config.about.ctaContact,
        config.about.focusTitle,
        config.about.principlesTitle,
        config.about.nowTitle,
        config.about.timelineTitle,
    ]
    if (strings.some((item) => !item.trim())) throw new Error('存在未填写的必填文本字段')
    if (!config.site.profile.tags.length || config.site.profile.tags.some((item) => !item.trim())) throw new Error('个人标签不能为空')
    if (!config.about.focusAreas.length || config.about.focusAreas.some((item) => !item.title.trim() || !item.description.trim())) throw new Error('写作方向条目不能为空')
    if (!config.about.principles.length || config.about.principles.some((item) => !item.trim())) throw new Error('工作方式条目不能为空')
    if (!config.about.nowList.length || config.about.nowList.some((item) => !item.trim())) throw new Error('最近在做条目不能为空')
    if (!config.about.timeline.length || config.about.timeline.some((item) => !item.year.trim() || !item.title.trim() || !item.note.trim())) throw new Error('时间线条目不能为空')
}

function InlineArrayEditor(props: {
    title: string
    values: string[]
    onChange: (index: number, value: string) => void
    onAdd: () => void
    onRemove: (index: number) => void
    onMove: (index: number, direction: -1 | 1) => void
}) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-sm text-[color:var(--ink)]">{props.title}</label>
                <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={props.onAdd}>
                    新增
                </Button>
            </div>
            {props.values.map((item, index) => (
                <div key={`${props.title}-${index}`} className="flex gap-2">
                    <Input value={item} onChange={(event) => props.onChange(index, event.target.value)} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" />
                    <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => props.onMove(index, -1)}>上移</Button>
                    <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => props.onMove(index, 1)}>下移</Button>
                    <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)] text-red-600" onClick={() => props.onRemove(index)} disabled={props.values.length <= 1}>删除</Button>
                </div>
            ))}
        </div>
    )
}

export default function SettingsPage() {
    type ConfigTab = 'brand' | 'profile' | 'about'
    const authUser = useAuthStore((state) => state.user)
    const logout = useAuthStore((state) => state.logout)
    const navigate = useNavigate()

    const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null)
    const [activeTab, setActiveTab] = useState<ConfigTab>('brand')
    const [meta, setMeta] = useState<Pick<AdminSiteConfigResponse, 'sourcePath' | 'lastModified' | 'writable' | 'backupPath'> | null>(null)
    const [passwordForm, setPasswordForm] = useState<UpdatePasswordRequest>({ currentPassword: '', newPassword: '', confirmPassword: '' })

    const profileQuery = useQuery({ queryKey: ['admin-settings-profile'], queryFn: getAdminProfile })
    const configQuery = useQuery({ queryKey: ['admin-settings-site-config'], queryFn: getAdminSiteConfig })

    useEffect(() => {
        if (!configQuery.data) return
        setSiteConfig(deepClone(configQuery.data.config))
        setMeta({
            sourcePath: configQuery.data.sourcePath,
            lastModified: configQuery.data.lastModified,
            writable: configQuery.data.writable,
            backupPath: configQuery.data.backupPath,
        })
    }, [configQuery.data])

    const patchConfig = (updater: (prev: SiteConfig) => void) => {
        setSiteConfig((prev) => {
            if (!prev) return prev
            const next = deepClone(prev)
            updater(next)
            return next
        })
    }

    const updateStringArray = (section: 'tags' | 'principles' | 'nowList', index: number, value: string) => {
        patchConfig((prev) => {
            const target = section === 'tags' ? prev.site.profile.tags : section === 'principles' ? prev.about.principles : prev.about.nowList
            target[index] = value
        })
    }

    const moveStringArray = (section: 'tags' | 'principles' | 'nowList', index: number, direction: -1 | 1) => {
        patchConfig((prev) => {
            const target = section === 'tags' ? prev.site.profile.tags : section === 'principles' ? prev.about.principles : prev.about.nowList
            const swap = index + direction
            if (swap < 0 || swap >= target.length) return
            const temp = target[index]
            target[index] = target[swap]
            target[swap] = temp
        })
    }

    const removeStringArray = (section: 'tags' | 'principles' | 'nowList', index: number) => {
        patchConfig((prev) => {
            const target = section === 'tags' ? prev.site.profile.tags : section === 'principles' ? prev.about.principles : prev.about.nowList
            if (target.length > 1) target.splice(index, 1)
        })
    }

    const addStringArray = (section: 'tags' | 'principles' | 'nowList') => {
        patchConfig((prev) => {
            const target = section === 'tags' ? prev.site.profile.tags : section === 'principles' ? prev.about.principles : prev.about.nowList
            target.push('')
        })
    }

    const passwordReady = useMemo(() => passwordForm.currentPassword.trim() && passwordForm.newPassword.trim().length >= 8 && passwordForm.confirmPassword.trim(), [passwordForm])

    const passwordMutation = useMutation({
        mutationFn: updateAdminPassword,
        onSuccess: () => {
            alert('密码已更新，请重新登录')
            logout()
            navigate('/admin/login', { replace: true })
        },
        onError: (error) => alert(extractErrorMessage(error, '密码修改失败，请稍后重试')),
    })

    const saveConfigMutation = useMutation({
        mutationFn: async () => {
            if (!siteConfig) throw new Error('站点配置尚未加载完成')
            validateConfig(siteConfig)
            return updateAdminSiteConfig(siteConfig)
        },
        onSuccess: (res) => {
            setSiteConfig(deepClone(res.config))
            setMeta({ sourcePath: res.sourcePath, lastModified: res.lastModified, writable: res.writable, backupPath: res.backupPath })
            alert(
                res.backupPath
                    ? `主配置已保存到 application.yml，同时创建备份：${res.backupPath}`
                    : '主配置已保存到 application.yml'
            )
        },
        onError: (error) => alert(extractErrorMessage(error, '站点配置保存失败，请稍后重试')),
    })

    const handlePasswordSubmit = (event: React.FormEvent) => {
        event.preventDefault()
        if (!passwordReady) {
            alert('请完整输入旧密码与新密码（至少8位）')
            return
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            alert('两次输入的新密码不一致')
            return
        }
        passwordMutation.mutate({
            currentPassword: passwordForm.currentPassword.trim(),
            newPassword: passwordForm.newPassword.trim(),
            confirmPassword: passwordForm.confirmPassword.trim(),
        })
    }

    const disableReload = configQuery.isLoading || saveConfigMutation.isPending
    const disableSave = configQuery.isLoading || saveConfigMutation.isPending || !siteConfig || !meta?.writable

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold font-display mb-2 text-[color:var(--ink)]">设置中心</h1>
                <p className="text-[color:var(--ink-muted)]">管理管理员账号安全与站点运行时配置。</p>
            </div>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                <CardHeader><CardTitle className="text-[color:var(--ink)]">账号安全</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2 md:grid-cols-3">
                        <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3"><div className="text-xs text-[color:var(--ink-soft)]">用户名</div><div className="mt-1 font-semibold text-[color:var(--ink)]">{profileQuery.data?.username || authUser?.username || '-'}</div></div>
                        <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3"><div className="text-xs text-[color:var(--ink-soft)]">角色</div><div className="mt-1 font-semibold text-[color:var(--ink)]">{profileQuery.data?.role || authUser?.role || '-'}</div></div>
                        <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3"><div className="text-xs text-[color:var(--ink-soft)]">邮箱</div><div className="mt-1 font-semibold text-[color:var(--ink)]">{profileQuery.data?.email || '-'}</div></div>
                    </div>
                    <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3">
                        <div className="text-xs text-[color:var(--ink-soft)]">邮箱重置</div>
                        <div className="mt-1 flex items-center gap-2"><Badge variant="outline" className="border-[color:var(--card-border)] text-[color:var(--ink-muted)]">二期上线</Badge><span className="text-sm">忘记旧密码将支持邮件重置</span></div>
                    </div>
                    <form onSubmit={handlePasswordSubmit} className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2"><label className="text-sm text-[color:var(--ink)]">旧密码</label><Input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))} className="bg-[color:var(--paper)] border-[color:var(--card-border)]" /></div>
                        <div className="space-y-2"><label className="text-sm text-[color:var(--ink)]">新密码</label><Input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))} className="bg-[color:var(--paper)] border-[color:var(--card-border)]" /></div>
                        <div className="space-y-2"><label className="text-sm text-[color:var(--ink)]">确认新密码</label><Input type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))} className="bg-[color:var(--paper)] border-[color:var(--card-border)]" /></div>
                        <div className="md:col-span-3 flex justify-end"><Button type="submit" className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]" disabled={passwordMutation.isPending}>{passwordMutation.isPending ? '提交中...' : '修改密码'}</Button></div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                <CardHeader><CardTitle className="text-[color:var(--ink)]">站点配置（application.yml）</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                    <div className="rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm text-[color:var(--ink-muted)]">
                        <div>配置路径：{meta?.sourcePath || '-'}</div>
                        <div>最后修改：{formatTime(meta?.lastModified)}</div>
                        <div>写入权限：{meta?.writable ? '可写' : '不可写'}</div>
                        <div>最近备份：{meta?.backupPath || '-'}</div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" className="border-[color:var(--card-border)]" onClick={() => configQuery.refetch()} disabled={disableReload}>从服务器重新加载</Button>
                        <Button className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]" onClick={() => saveConfigMutation.mutate()} disabled={disableSave}>{saveConfigMutation.isPending ? '保存中...' : '保存配置'}</Button>
                    </div>
                    {configQuery.isError && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                            配置加载失败：{extractErrorMessage(configQuery.error, '请检查后端日志与配置路径')}
                        </div>
                    )}

                    {siteConfig && (
                        <div className="space-y-6">
                            <div className="space-y-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-4">
                                <div className="grid gap-2 md:grid-cols-3">
                                    <button
                                        type="button"
                                        className={`rounded-lg border px-3 py-2 text-left ${
                                            activeTab === 'brand'
                                                ? 'border-[color:var(--accent)] bg-[color:var(--paper-strong)] text-[color:var(--ink)]'
                                                : 'border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-soft)]'
                                        }`}
                                        onClick={() => setActiveTab('brand')}
                                    >
                                        <div className="text-sm font-semibold">基础与导航</div>
                                        <div className="mt-1 text-xs">站点标题、首页品牌、导航与页脚文案</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-lg border px-3 py-2 text-left ${
                                            activeTab === 'profile'
                                                ? 'border-[color:var(--accent)] bg-[color:var(--paper-strong)] text-[color:var(--ink)]'
                                                : 'border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-soft)]'
                                        }`}
                                        onClick={() => setActiveTab('profile')}
                                    >
                                        <div className="text-sm font-semibold">作者资料</div>
                                        <div className="mt-1 text-xs">姓名、角色、头像、联系方式与标签</div>
                                    </button>
                                    <button
                                        type="button"
                                        className={`rounded-lg border px-3 py-2 text-left ${
                                            activeTab === 'about'
                                                ? 'border-[color:var(--accent)] bg-[color:var(--paper-strong)] text-[color:var(--ink)]'
                                                : 'border-[color:var(--card-border)] text-[color:var(--ink-muted)] hover:bg-[color:var(--paper-soft)]'
                                        }`}
                                        onClick={() => setActiveTab('about')}
                                    >
                                        <div className="text-sm font-semibold">关于页</div>
                                        <div className="mt-1 text-xs">个人介绍、写作方向、原则、最近在做、时间线</div>
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'brand' && (
                                <section className="space-y-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-4">
                                <h3 className="text-lg font-semibold text-[color:var(--ink)]">站点基础与品牌</h3>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Input value={siteConfig.site.meta.title} onChange={(event) => patchConfig((prev) => { prev.site.meta.title = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="浏览器标题" />
                                    <Input value={siteConfig.site.meta.subtitle} onChange={(event) => patchConfig((prev) => { prev.site.meta.subtitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="副标题" />
                                    <Input value={siteConfig.site.brand.navName} onChange={(event) => patchConfig((prev) => { prev.site.brand.navName = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="导航品牌名" />
                                    <Input value={siteConfig.site.brand.heroEyebrow} onChange={(event) => patchConfig((prev) => { prev.site.brand.heroEyebrow = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="首页抬头" />
                                    <div className="md:col-span-2"><Input value={siteConfig.site.brand.heroTitle} onChange={(event) => patchConfig((prev) => { prev.site.brand.heroTitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="首页主标题" /></div>
                                    <div className="md:col-span-2"><textarea className={textAreaClass} rows={3} value={siteConfig.site.brand.heroDescription} onChange={(event) => patchConfig((prev) => { prev.site.brand.heroDescription = event.target.value })} placeholder="首页描述" /></div>
                                    <div className="md:col-span-2"><Input value={siteConfig.site.brand.footerText} onChange={(event) => patchConfig((prev) => { prev.site.brand.footerText = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="页脚文案" /></div>
                                </div>
                                <div className="grid gap-2 md:grid-cols-4">
                                    <Input value={siteConfig.site.brand.navLabels.home} onChange={(event) => patchConfig((prev) => { prev.site.brand.navLabels.home = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="首页" />
                                    <Input value={siteConfig.site.brand.navLabels.about} onChange={(event) => patchConfig((prev) => { prev.site.brand.navLabels.about = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="关于" />
                                    <Input value={siteConfig.site.brand.navLabels.archive} onChange={(event) => patchConfig((prev) => { prev.site.brand.navLabels.archive = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="文章" />
                                    <Input value={siteConfig.site.brand.navLabels.admin} onChange={(event) => patchConfig((prev) => { prev.site.brand.navLabels.admin = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="后台" />
                                </div>
                                </section>
                            )}

                            {activeTab === 'profile' && (
                                <section className="space-y-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-4">
                                <h3 className="text-lg font-semibold text-[color:var(--ink)]">作者资料</h3>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <Input value={siteConfig.site.profile.name} onChange={(event) => patchConfig((prev) => { prev.site.profile.name = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="姓名" />
                                    <Input value={siteConfig.site.profile.initials} onChange={(event) => patchConfig((prev) => { prev.site.profile.initials = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="缩写" />
                                    <Input value={siteConfig.site.profile.role} onChange={(event) => patchConfig((prev) => { prev.site.profile.role = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="角色" />
                                    <Input value={siteConfig.site.profile.email} onChange={(event) => patchConfig((prev) => { prev.site.profile.email = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="邮箱" />
                                    <Input value={siteConfig.site.profile.location} onChange={(event) => patchConfig((prev) => { prev.site.profile.location = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="地点" />
                                    <Input value={siteConfig.site.profile.expertise} onChange={(event) => patchConfig((prev) => { prev.site.profile.expertise = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="擅长" />
                                    <div className="md:col-span-2"><Input value={siteConfig.site.profile.avatarUrl} onChange={(event) => patchConfig((prev) => { prev.site.profile.avatarUrl = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="头像 URL" /></div>
                                    <div className="md:col-span-2"><textarea className={textAreaClass} rows={3} value={siteConfig.site.profile.bio} onChange={(event) => patchConfig((prev) => { prev.site.profile.bio = event.target.value })} placeholder="简介" /></div>
                                </div>
                                <InlineArrayEditor title="个人标签" values={siteConfig.site.profile.tags} onChange={(index, value) => updateStringArray('tags', index, value)} onAdd={() => addStringArray('tags')} onRemove={(index) => removeStringArray('tags', index)} onMove={(index, direction) => moveStringArray('tags', index, direction)} />
                                </section>
                            )}

                            {activeTab === 'about' && (
                                <section className="space-y-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-4">
                                <h3 className="text-lg font-semibold text-[color:var(--ink)]">关于页</h3>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="md:col-span-2"><Input value={siteConfig.about.heading} onChange={(event) => patchConfig((prev) => { prev.about.heading = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="标题" /></div>
                                    <div className="md:col-span-2"><textarea className={textAreaClass} rows={4} value={siteConfig.about.intro} onChange={(event) => patchConfig((prev) => { prev.about.intro = event.target.value })} placeholder="简介" /></div>
                                    <Input value={siteConfig.about.ctaArchive} onChange={(event) => patchConfig((prev) => { prev.about.ctaArchive = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="CTA-文章" />
                                    <Input value={siteConfig.about.ctaContact} onChange={(event) => patchConfig((prev) => { prev.about.ctaContact = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="CTA-联系" />
                                    <Input value={siteConfig.about.focusTitle} onChange={(event) => patchConfig((prev) => { prev.about.focusTitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="写作方向标题" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between"><label className="text-sm">写作方向</label><Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { prev.about.focusAreas.push({ title: '', description: '' }) })}>新增</Button></div>
                                    {siteConfig.about.focusAreas.map((item, index) => (
                                        <div key={`focus-${index}`} className="grid gap-2 md:grid-cols-[1fr_2fr_auto_auto_auto]">
                                            <Input value={item.title} onChange={(event) => patchConfig((prev) => { prev.about.focusAreas[index].title = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="标题" />
                                            <Input value={item.description} onChange={(event) => patchConfig((prev) => { prev.about.focusAreas[index].description = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="描述" />
                                            <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { const swap = index - 1; if (swap < 0) return; const t = prev.about.focusAreas[index]; prev.about.focusAreas[index] = prev.about.focusAreas[swap]; prev.about.focusAreas[swap] = t })}>上移</Button>
                                            <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { const swap = index + 1; if (swap >= prev.about.focusAreas.length) return; const t = prev.about.focusAreas[index]; prev.about.focusAreas[index] = prev.about.focusAreas[swap]; prev.about.focusAreas[swap] = t })}>下移</Button>
                                            <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)] text-red-600" disabled={siteConfig.about.focusAreas.length <= 1} onClick={() => patchConfig((prev) => { if (prev.about.focusAreas.length > 1) prev.about.focusAreas.splice(index, 1) })}>删除</Button>
                                        </div>
                                    ))}
                                </div>

                                <Input value={siteConfig.about.principlesTitle} onChange={(event) => patchConfig((prev) => { prev.about.principlesTitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="工作方式标题" />
                                <InlineArrayEditor title="工作方式" values={siteConfig.about.principles} onChange={(index, value) => updateStringArray('principles', index, value)} onAdd={() => addStringArray('principles')} onRemove={(index) => removeStringArray('principles', index)} onMove={(index, direction) => moveStringArray('principles', index, direction)} />

                                <Input value={siteConfig.about.nowTitle} onChange={(event) => patchConfig((prev) => { prev.about.nowTitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="最近在做标题" />
                                <InlineArrayEditor title="最近在做" values={siteConfig.about.nowList} onChange={(index, value) => updateStringArray('nowList', index, value)} onAdd={() => addStringArray('nowList')} onRemove={(index) => removeStringArray('nowList', index)} onMove={(index, direction) => moveStringArray('nowList', index, direction)} />

                                <Input value={siteConfig.about.timelineTitle} onChange={(event) => patchConfig((prev) => { prev.about.timelineTitle = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="时间线标题" />
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between"><label className="text-sm">时间线</label><Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { prev.about.timeline.push({ year: '', title: '', note: '' }) })}>新增</Button></div>
                                    {siteConfig.about.timeline.map((item, index) => (
                                        <div key={`timeline-${index}`} className="space-y-2 rounded-lg border border-[color:var(--card-border)] p-3">
                                            <div className="grid gap-2 md:grid-cols-[120px_1fr_auto_auto_auto]">
                                                <Input value={item.year} onChange={(event) => patchConfig((prev) => { prev.about.timeline[index].year = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="年份" />
                                                <Input value={item.title} onChange={(event) => patchConfig((prev) => { prev.about.timeline[index].title = event.target.value })} className="bg-[color:var(--paper-soft)] border-[color:var(--card-border)]" placeholder="标题" />
                                                <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { const swap = index - 1; if (swap < 0) return; const t = prev.about.timeline[index]; prev.about.timeline[index] = prev.about.timeline[swap]; prev.about.timeline[swap] = t })}>上移</Button>
                                                <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)]" onClick={() => patchConfig((prev) => { const swap = index + 1; if (swap >= prev.about.timeline.length) return; const t = prev.about.timeline[index]; prev.about.timeline[index] = prev.about.timeline[swap]; prev.about.timeline[swap] = t })}>下移</Button>
                                                <Button type="button" variant="outline" size="sm" className="border-[color:var(--card-border)] text-red-600" disabled={siteConfig.about.timeline.length <= 1} onClick={() => patchConfig((prev) => { if (prev.about.timeline.length > 1) prev.about.timeline.splice(index, 1) })}>删除</Button>
                                            </div>
                                            <textarea className={textAreaClass} rows={2} value={item.note} onChange={(event) => patchConfig((prev) => { prev.about.timeline[index].note = event.target.value })} placeholder="说明" />
                                        </div>
                                    ))}
                                </div>
                                </section>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
