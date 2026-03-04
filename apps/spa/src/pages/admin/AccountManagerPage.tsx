import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type {
    AdminAccountCreateRequest,
    AdminAccountPermissionOption,
    AdminAccountSummary,
    AdminAccountUpdateRequest,
} from '../../types/api'

const OWNER_USERNAME = 'shyl'

const TAB_LABEL_MAP: Record<string, string> = {
    DASHBOARD: '仪表盘',
    ARTICLES: '文章管理',
    WRITE: '写文章',
    UPLOAD: '上传文章',
    COMMENTS: '评论管理',
    TAGS: '标签管理',
    CATEGORIES: '分类管理',
    FOOTPRINTS: '足迹管理',
    MATERIALS: '照片墙',
    COVER_MATERIALS: '素材池',
    SETTINGS: '设置',
    ACCOUNTS: '账号管理',
}

const TAB_DESC_MAP: Record<string, string> = {
    DASHBOARD: '后台概览与统计',
    ARTICLES: '文章列表与发布状态管理',
    WRITE: '创建和编辑文章',
    UPLOAD: 'Markdown/Notion 导入',
    COMMENTS: '评论审核与处理',
    TAGS: '标签维护',
    CATEGORIES: '分类维护',
    FOOTPRINTS: '旅程与计划管理',
    MATERIALS: '照片墙上传、地址绑定与归档',
    COVER_MATERIALS: '文章封面素材管理',
    SETTINGS: '站点配置维护',
    ACCOUNTS: '账号与权限管理',
}

function formatDate(value?: string) {
    if (!value) return '--'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('zh-CN', { hour12: false })
}

function resolveTabLabel(code: string, options: AdminAccountPermissionOption[]) {
    if (TAB_LABEL_MAP[code]) return TAB_LABEL_MAP[code]
    const matched = options.find((item) => item.code === code)
    return matched?.label || code
}

function resolveOptionDescription(option: AdminAccountPermissionOption) {
    return TAB_DESC_MAP[option.code] || option.description
}

export default function AccountManagerPage() {
    const [createForm, setCreateForm] = useState<AdminAccountCreateRequest>({
        username: '',
        email: '',
        password: '',
        enabled: true,
        tabCodes: [],
    })
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editForm, setEditForm] = useState<AdminAccountUpdateRequest>({ email: '', enabled: true, tabCodes: [] })
    const [resetPassword, setResetPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const optionsQuery = useQuery({
        queryKey: ['admin-account-permission-options'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<AdminAccountPermissionOption[]>>('/admin/accounts/permission-options')
            return unwrapResponse(res.data)
        },
    })

    const accountsQuery = useQuery({
        queryKey: ['admin-accounts'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<AdminAccountSummary[]>>('/admin/accounts')
            return unwrapResponse(res.data)
        },
    })

    const permissionOptions = optionsQuery.data ?? []
    const accounts = accountsQuery.data ?? []

    const sortedAccounts = useMemo(
        () =>
            [...accounts].sort((a, b) => {
                if (a.username === OWNER_USERNAME) return -1
                if (b.username === OWNER_USERNAME) return 1
                return (b.createdAt || '').localeCompare(a.createdAt || '')
            }),
        [accounts]
    )

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...createForm,
                username: createForm.username.trim(),
                email: createForm.email.trim(),
                password: createForm.password.trim(),
            }
            const res = await api.post<ApiResponse<AdminAccountSummary>>('/admin/accounts', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            accountsQuery.refetch()
            setCreateForm({ username: '', email: '', password: '', enabled: true, tabCodes: [] })
            alert('账号创建成功')
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '账号创建失败')
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: AdminAccountUpdateRequest }) => {
            const res = await api.put<ApiResponse<AdminAccountSummary>>(`/admin/accounts/${id}`, payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            accountsQuery.refetch()
            setEditingId(null)
            alert('账号已更新')
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '账号更新失败')
        },
    })

    const toggleEnabledMutation = useMutation({
        mutationFn: async (account: AdminAccountSummary) => {
            try {
                const res = await api.put<ApiResponse<AdminAccountSummary>>(`/admin/accounts/${account.id}/enabled`, {
                    enabled: !account.enabled,
                })
                return unwrapResponse(res.data)
            } catch (error) {
                // 兼容未升级后端：404 时回退到旧更新接口。
                if (isAxiosError(error) && error.response?.status === 404) {
                    const allowedCodes = new Set(permissionOptions.map((item) => item.code))
                    const fallbackPayload: AdminAccountUpdateRequest = {
                        email: account.email,
                        enabled: !account.enabled,
                        tabCodes: account.tabCodes.filter((code) => allowedCodes.has(code)),
                    }
                    const fallbackRes = await api.put<ApiResponse<AdminAccountSummary>>(
                        `/admin/accounts/${account.id}`,
                        fallbackPayload
                    )
                    return unwrapResponse(fallbackRes.data)
                }
                throw error
            }
        },
        onSuccess: (_data, account) => {
            accountsQuery.refetch()
            alert(account.enabled ? '账号已禁用' : '账号已启用')
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '启用/禁用失败')
        },
    })

    const resetPasswordMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.put<ApiResponse<void>>(`/admin/accounts/${id}/password`, {
                newPassword: resetPassword,
                confirmPassword,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setResetPassword('')
            setConfirmPassword('')
            alert('密码已重置')
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '密码重置失败')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await api.delete<ApiResponse<void>>(`/admin/accounts/${id}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            accountsQuery.refetch()
            alert('账号已删除')
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '账号删除失败')
        },
    })

    const toggleCreateTabCode = (code: string) => {
        setCreateForm((prev) => {
            const exists = prev.tabCodes.includes(code)
            return {
                ...prev,
                tabCodes: exists ? prev.tabCodes.filter((item) => item !== code) : [...prev.tabCodes, code],
            }
        })
    }

    const toggleEditTabCode = (code: string) => {
        setEditForm((prev) => {
            const exists = prev.tabCodes.includes(code)
            return {
                ...prev,
                tabCodes: exists ? prev.tabCodes.filter((item) => item !== code) : [...prev.tabCodes, code],
            }
        })
    }

    const beginEdit = (account: AdminAccountSummary) => {
        setEditingId(account.id)
        setEditForm({
            email: account.email,
            enabled: account.enabled,
            tabCodes: account.tabCodes.filter((tab) => permissionOptions.some((option) => option.code === tab)),
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 text-3xl font-display font-semibold text-[color:var(--ink)]">账号管理</h1>
                <p className="text-[color:var(--ink-muted)]">管理成员账号、菜单授权与密码重置。</p>
            </div>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                <CardHeader>
                    <CardTitle>创建成员账号</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Input
                            value={createForm.username}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))}
                            placeholder="用户名"
                        />
                        <Input
                            value={createForm.email}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
                            placeholder="邮箱"
                        />
                        <Input
                            type="password"
                            value={createForm.password}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))}
                            placeholder="初始密码（至少8位）"
                        />
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={createForm.enabled}
                            onChange={(event) => setCreateForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                        />
                        创建后启用账号
                    </label>
                    <div className="grid gap-2 md:grid-cols-3">
                        {permissionOptions.map((option) => (
                            <label key={option.code} className="rounded-lg border border-[color:var(--card-border)] p-3 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{resolveTabLabel(option.code, permissionOptions)}</span>
                                    <input
                                        type="checkbox"
                                        checked={createForm.tabCodes.includes(option.code)}
                                        onChange={() => toggleCreateTabCode(option.code)}
                                    />
                                </div>
                                <div className="mt-1 text-xs text-[color:var(--ink-soft)]">{resolveOptionDescription(option)}</div>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => createMutation.mutate()}
                            className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? '创建中...' : '创建账号'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                <CardHeader>
                    <CardTitle>账号列表</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {accountsQuery.isLoading && <div className="text-sm text-[color:var(--ink-soft)]">加载中...</div>}
                    {!accountsQuery.isLoading &&
                        sortedAccounts.map((account) => {
                            const isOwner = account.username === OWNER_USERNAME
                            const isEditing = editingId === account.id
                            return (
                                <div key={account.id} className="space-y-3 rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)] p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{account.username}</span>
                                        <Badge variant="outline">{account.role}</Badge>
                                        {isOwner && <Badge className="bg-[color:var(--accent)] text-white">主人账号</Badge>}
                                        {isOwner ? (
                                            <Badge variant={account.enabled ? 'default' : 'secondary'}>
                                                {account.enabled ? '启用' : '禁用'}
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-[color:var(--card-border)]"
                                                onClick={() => toggleEnabledMutation.mutate(account)}
                                                disabled={toggleEnabledMutation.isPending}
                                            >
                                                {account.enabled ? '启用（点击禁用）' : '禁用（点击启用）'}
                                            </Button>
                                        )}
                                        <span className="text-xs text-[color:var(--ink-soft)]">创建于 {formatDate(account.createdAt)}</span>
                                    </div>

                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <Input
                                                    value={editForm.email}
                                                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                                                    placeholder="邮箱"
                                                />
                                                <label className="inline-flex items-center gap-2 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.enabled}
                                                        onChange={(event) =>
                                                            setEditForm((prev) => ({ ...prev, enabled: event.target.checked }))
                                                        }
                                                    />
                                                    启用账号
                                                </label>
                                            </div>
                                            <div className="grid gap-2 md:grid-cols-3">
                                                {permissionOptions.map((option) => (
                                                    <label key={option.code} className="rounded-lg border border-[color:var(--card-border)] p-3 text-sm">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-medium">{resolveTabLabel(option.code, permissionOptions)}</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={editForm.tabCodes.includes(option.code)}
                                                                onChange={() => toggleEditTabCode(option.code)}
                                                            />
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => updateMutation.mutate({ id: account.id, payload: editForm })}
                                                    disabled={updateMutation.isPending}
                                                >
                                                    保存
                                                </Button>
                                                <Button variant="outline" onClick={() => setEditingId(null)}>
                                                    取消
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 text-sm">
                                            <div>邮箱：{account.email}</div>
                                            <div className="flex flex-wrap gap-2">
                                                {account.tabCodes.length ? (
                                                    account.tabCodes.map((tab) => (
                                                        <Badge key={`${account.id}-${tab}`} variant="secondary">
                                                            {resolveTabLabel(tab, permissionOptions)}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-[color:var(--ink-soft)]">暂无授权菜单</span>
                                                )}
                                            </div>
                                            {!isOwner && (
                                                <div className="flex flex-wrap gap-2">
                                                    <Button variant="outline" onClick={() => beginEdit(account)}>
                                                        编辑授权
                                                    </Button>
                                                    <Input
                                                        type="password"
                                                        className="w-56"
                                                        placeholder="新密码（至少8位）"
                                                        value={resetPassword}
                                                        onChange={(event) => setResetPassword(event.target.value)}
                                                    />
                                                    <Input
                                                        type="password"
                                                        className="w-56"
                                                        placeholder="确认新密码"
                                                        value={confirmPassword}
                                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                                    />
                                                    <Button
                                                        onClick={() => resetPasswordMutation.mutate(account.id)}
                                                        disabled={
                                                            resetPasswordMutation.isPending ||
                                                            resetPassword.length < 8 ||
                                                            !confirmPassword
                                                        }
                                                    >
                                                        重置密码
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => {
                                                            if (!confirm(`确认删除账号 ${account.username} 吗？`)) return
                                                            deleteMutation.mutate(account.id)
                                                        }}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        删除账号
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                </CardContent>
            </Card>
        </div>
    )
}

