import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { FileUp } from 'lucide-react'
import MarkdownPreview from '@uiw/react-markdown-preview'
import '@uiw/react-markdown-preview/markdown.css'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Category, Tag } from '../../types/api'
import { flattenCategoryTree } from '../../lib/categoryTree'
import { slugify } from '../../lib/slug'

type NotionAuthMode = 'AUTO' | 'OAUTH' | 'INTEGRATION' | 'PUBLIC'
type NotionOwnerType = 'user' | 'workspace'

interface NotionPreview {
    title: string
    summary: string
    content: string
}

interface NotionConnectionStatus {
    connected: boolean
    workspaceName?: string
    ownerType?: string
    oauthConfigured?: boolean
    oauthRedirectUri?: string
    integrationEnabled: boolean
    publicImportEnabled: boolean
}

interface NotionOAuthUrlResponse {
    url: string
    state: string
}

function normalizeNotionError(message: string | undefined, fallback: string) {
    if (!message) return fallback
    if (message.includes('\uFFFD')) return fallback
    return message
}

export default function ArticleUploadPage() {
    const [fileName, setFileName] = useState('')
    const [content, setContent] = useState('')
    const [title, setTitle] = useState('')
    const [summary, setSummary] = useState('')
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
    const [categorySearch, setCategorySearch] = useState('')
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [tagIds, setTagIds] = useState<number[]>([])

    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const [notionUrl, setNotionUrl] = useState('')
    const [notionError, setNotionError] = useState<string | null>(null)
    const [publishOnImport, setPublishOnImport] = useState(false)
    const [notionAuthMode, setNotionAuthMode] = useState<NotionAuthMode>('AUTO')
    const [notionOwnerType, setNotionOwnerType] = useState<NotionOwnerType>('user')
    const [tokenOverride, setTokenOverride] = useState('')

    const categoriesQuery = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<Category[]>>('/categories')
            return unwrapResponse(res.data)
        },
    })

    const tagsQuery = useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<Tag[]>>('/tags')
            return unwrapResponse(res.data)
        },
    })

    const notionConnectionQuery = useQuery({
        queryKey: ['notion-connection'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<NotionConnectionStatus>>('/admin/notion/connection')
            return unwrapResponse(res.data)
        },
    })

    const flatCategories = useMemo(() => flattenCategoryTree(categoriesQuery.data ?? []), [categoriesQuery.data])
    const selectedCategory = useMemo(
        () => flatCategories.find((c) => c.id === categoryId),
        [flatCategories, categoryId]
    )
    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return flatCategories
        const needle = categorySearch.toLowerCase()
        return flatCategories.filter((c) => `${c.name}${c.path}`.toLowerCase().includes(needle))
    }, [categorySearch, flatCategories])

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                title: title || fileName || '未命名',
                slug: slugify(title || fileName, 'untitled'),
                summary,
                content,
                categoryId,
                tagIds,
            }
            const res = await api.post<ApiResponse<number>>('/articles', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            alert('上传并创建成功')
            setFileName('')
            setContent('')
            setTitle('')
            setSummary('')
            setCategoryId(undefined)
            setCategorySearch('')
            setTagIds([])
            setErrorMsg(null)
        },
        onError: (err: any) => {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                '上传失败，请检查文件内容（正文不能为空，标题需唯一）'
            setErrorMsg(msg)
        },
    })

    const notionPreviewMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post<ApiResponse<NotionPreview>>('/admin/articles/import-notion/preview', {
                shareUrl: notionUrl.trim(),
                authMode: notionAuthMode,
                tokenOverride: tokenOverride.trim() || undefined,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: (data) => {
            setContent(data.content || '')
            setTitle(data.title || '')
            setSummary(data.summary || '')
            setErrorMsg(null)
            setNotionError(null)
        },
        onError: (err: any) => {
            const raw = err?.response?.data?.message || err?.message
            setNotionError(normalizeNotionError(raw, 'Notion 预览失败，请确认链接已分享或授权'))
        },
    })

    const notionImportMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                shareUrl: notionUrl.trim(),
                authMode: notionAuthMode,
                tokenOverride: tokenOverride.trim() || undefined,
                titleOverride: title.trim() || undefined,
                summaryOverride: summary.trim() || undefined,
                categoryId,
                tagIds,
                publish: publishOnImport,
            }
            const res = await api.post<ApiResponse<number>>('/admin/articles/import-notion', payload)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            alert('Notion 导入成功')
            setNotionUrl('')
            setFileName('')
            setContent('')
            setTitle('')
            setSummary('')
            setCategoryId(undefined)
            setCategorySearch('')
            setTagIds([])
            setErrorMsg(null)
            setNotionError(null)
            setPublishOnImport(false)
            setTokenOverride('')
        },
        onError: (err: any) => {
            const raw = err?.response?.data?.message || err?.message
            setNotionError(normalizeNotionError(raw, 'Notion 导入失败，请检查链接或配置'))
        },
    })

    const notionConnectMutation = useMutation({
        mutationFn: async () => {
            const res = await api.get<ApiResponse<NotionOAuthUrlResponse>>('/admin/notion/oauth/url', {
                params: { owner: notionOwnerType },
            })
            return unwrapResponse(res.data)
        },
        onSuccess: (data) => {
            if (data?.state) {
                sessionStorage.setItem('notion_oauth_state', data.state)
            }
            if (data?.url) {
                window.location.href = data.url
            }
        },
        onError: (err: any) => {
            const raw = err?.response?.data?.message || err?.message
            setNotionError(normalizeNotionError(raw, 'Notion OAuth 授权失败'))
        },
    })

    const notionDisconnectMutation = useMutation({
        mutationFn: async () => {
            const res = await api.delete<ApiResponse<string>>('/admin/notion/connection')
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            notionConnectionQuery.refetch()
            setNotionError(null)
        },
        onError: (err: any) => {
            const raw = err?.response?.data?.message || err?.message
            setNotionError(normalizeNotionError(raw, 'Notion 断开连接失败'))
        },
    })

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.md')) {
            setErrorMsg('仅支持 .md 文件')
            return
        }

        setErrorMsg(null)
        setFileName(file.name.replace(/\.md$/i, ''))

        const reader = new FileReader()
        reader.onload = (e) => {
            const text = (e.target?.result as string) || ''
            setContent(text)
            const guessedTitle = extractTitle(text) || file.name.replace(/\.md$/i, '')
            setTitle(guessedTitle)
            setSummary(extractSummary(text))
        }
        reader.readAsText(file, 'utf-8')
    }

    const selectedTags = useMemo(
        () => tagIds.map((id) => tagsQuery.data?.find((t) => t.id === id)).filter(Boolean) as Tag[],
        [tagIds, tagsQuery.data]
    )

    const toggleTag = (id: number) => {
        setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
    }

    const notionConnection = notionConnectionQuery.data
    const oauthConnected = Boolean(notionConnection?.connected)
    const oauthConfigured = notionConnection?.oauthConfigured ?? true
    const integrationEnabled = Boolean(notionConnection?.integrationEnabled)
    const publicEnabled = Boolean(notionConnection?.publicImportEnabled)
    const hasTokenOverride = tokenOverride.trim().length > 0

    const authModeBlockedReason = (() => {
        if (notionAuthMode === 'OAUTH') {
            if (!oauthConfigured) return 'Notion OAuth 配置缺失，请先配置后端环境变量'
            if (!oauthConnected) return '请先连接 Notion OAuth'
            return ''
        }

        if (notionAuthMode === 'INTEGRATION') {
            if (!integrationEnabled && !hasTokenOverride) {
                return '未配置服务端 NOTION_TOKEN，请在下方填写内部 Token'
            }
            return ''
        }

        if (notionAuthMode === 'PUBLIC' && !publicEnabled) return '公开页面导入未启用'

        if (notionAuthMode === 'AUTO') {
            if (!oauthConnected && !integrationEnabled && !hasTokenOverride && !publicEnabled) {
                return '未配置 OAuth/Token，且公开导入未启用'
            }
        }

        return ''
    })()

    const canSubmit = content.trim().length > 0 && (title.trim().length > 0 || fileName)
    const canImportNotion = notionUrl.trim().length > 0 && !authModeBlockedReason

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-semibold font-display mb-2 text-[color:var(--ink)]">上传文章</h1>
                <p className="text-[color:var(--ink-muted)]">支持 Markdown 文件上传与 Notion 分享链接导入。</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,360px)] xl:grid-cols-[minmax(0,1.6fr)_380px] items-start">
                <div className="space-y-6 min-w-0">
                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                        <CardHeader>
                            <CardTitle>Notion 导入</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm text-[color:var(--ink-muted)]">Notion 分享链接</p>
                                <Input
                                    value={notionUrl}
                                    onChange={(e) => setNotionUrl(e.target.value)}
                                    placeholder="粘贴 Notion 页面分享链接"
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)]"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-[color:var(--ink-muted)]">导入方式</p>
                                <select
                                    value={notionAuthMode}
                                    onChange={(e) => setNotionAuthMode(e.target.value as NotionAuthMode)}
                                    className="w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink)]"
                                >
                                    <option value="AUTO">自动（优先 OAuth，其次 Token）</option>
                                    <option value="OAUTH">{oauthConnected ? 'OAuth（个人账号）' : 'OAuth（个人账号）-未连接'}</option>
                                    <option value="INTEGRATION">{integrationEnabled ? 'Integration Token' : 'Integration Token-未配置'}</option>
                                    <option value="PUBLIC">{publicEnabled ? '公开页面（实验）' : '公开页面（实验）-未启用'}</option>
                                </select>
                            </div>

                            {(notionAuthMode === 'AUTO' || notionAuthMode === 'INTEGRATION') && (
                                <div className="space-y-2">
                                    <p className="text-sm text-[color:var(--ink-muted)]">内部 Token（可选）</p>
                                    <Input
                                        value={tokenOverride}
                                        onChange={(e) => setTokenOverride(e.target.value)}
                                        placeholder="粘贴 ntn_...，仅用于当前导入请求"
                                        type="password"
                                        className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)]"
                                    />
                                    {!integrationEnabled && !hasTokenOverride && (
                                        <p className="text-xs text-[#b45309]">
                                            服务端未配置 NOTION_TOKEN，可在此临时填写内部 Token。
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-[color:var(--ink)]">OAuth 连接状态</span>
                                    <span className="text-[color:var(--ink-muted)]">
                                        {notionConnectionQuery.isLoading
                                            ? '检测中...'
                                            : oauthConnected
                                                ? `已连接${notionConnection?.workspaceName ? ` · ${notionConnection.workspaceName}` : ''}`
                                                : '未连接'}
                                    </span>
                                </div>

                                {!oauthConfigured && (
                                    <p className="text-xs text-[#b45309]">
                                        OAuth 未配置：请设置 `NOTION_OAUTH_CLIENT_ID`、`NOTION_OAUTH_CLIENT_SECRET`。
                                    </p>
                                )}
                                {notionConnection?.oauthRedirectUri && (
                                    <p className="text-xs text-[color:var(--ink-soft)]">回调地址：{notionConnection.oauthRedirectUri}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="text-xs text-[color:var(--ink-muted)]">授权主体</label>
                                    <select
                                        value={notionOwnerType}
                                        onChange={(e) => setNotionOwnerType(e.target.value as NotionOwnerType)}
                                        className="rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] px-2 py-1 text-xs text-[color:var(--ink)]"
                                    >
                                        <option value="user">个人账号</option>
                                        <option value="workspace">工作区</option>
                                    </select>
                                    <Button
                                        variant="outline"
                                        onClick={() => notionConnectMutation.mutate()}
                                        disabled={notionConnectMutation.isPending || !oauthConfigured}
                                    >
                                        {notionConnectMutation.isPending ? '连接中...' : '连接 Notion'}
                                    </Button>
                                    {oauthConnected && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => notionDisconnectMutation.mutate()}
                                            disabled={notionDisconnectMutation.isPending}
                                        >
                                            {notionDisconnectMutation.isPending ? '断开中...' : '断开连接'}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-[color:var(--ink-muted)]">
                                <input
                                    type="checkbox"
                                    checked={publishOnImport}
                                    onChange={(e) => setPublishOnImport(e.target.checked)}
                                />
                                导入后直接发布
                            </label>

                            <div className="flex flex-wrap gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => notionPreviewMutation.mutate()}
                                    disabled={!canImportNotion || notionPreviewMutation.isPending}
                                >
                                    {notionPreviewMutation.isPending ? '获取中...' : '获取内容'}
                                </Button>
                                <Button
                                    onClick={() => notionImportMutation.mutate()}
                                    disabled={!canImportNotion || notionImportMutation.isPending}
                                    className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                >
                                    {notionImportMutation.isPending ? '导入中...' : '导入并创建'}
                                </Button>
                            </div>

                            {authModeBlockedReason && <p className="text-xs text-[#b45309]">{authModeBlockedReason}</p>}
                            {notionError && <p className="text-xs text-[#b91c1c]">{notionError}</p>}
                        </CardContent>
                    </Card>

                    <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileUp className="h-4 w-4" />
                                上传 Markdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input type="file" accept=".md" onChange={handleFileChange} />

                            <div className="space-y-2">
                                <p className="text-sm text-[color:var(--ink-muted)]">标题</p>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="自动填充自文件名，可自行修改"
                                    className="bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)]"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-[color:var(--ink-muted)]">摘要</p>
                                <textarea
                                    className="w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink)]"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    rows={3}
                                    placeholder="自动截取正文前几句话，可自行调整"
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-[color:var(--ink-muted)]">正文预览</p>
                                <div className="rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] p-3 text-sm text-[color:var(--ink-muted)] max-h-[520px] overflow-auto">
                                    {content ? (
                                        <div data-color-mode="light">
                                            <MarkdownPreview source={content} />
                                        </div>
                                    ) : (
                                        <span className="text-[color:var(--ink-soft)]">尚未选择文件</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => createMutation.mutate()}
                                    disabled={!canSubmit || createMutation.isPending}
                                    className="min-w-[140px] bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                                >
                                    {createMutation.isPending ? '上传中...' : '上传并创建'}
                                </Button>
                            </div>
                            {errorMsg && <p className="text-xs text-[#b91c1c]">{errorMsg}</p>}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_26px_50px_-40px_rgba(31,41,55,0.35)] lg:sticky lg:top-24 min-w-0">
                    <CardHeader>
                        <CardTitle className="text-[color:var(--ink)]">元信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-[color:var(--ink-muted)]">分类</p>
                            <div className="relative">
                                <Input
                                    value={categorySearch}
                                    onChange={(e) => {
                                        setCategorySearch(e.target.value)
                                        setShowCategoryDropdown(true)
                                    }}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    placeholder="搜索或选择分类"
                                    className="w-full text-sm bg-[color:var(--paper)] border-[color:var(--card-border)] text-[color:var(--ink)]"
                                />
                                {showCategoryDropdown && (
                                    <div className="absolute z-20 mt-1 w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] shadow-md max-h-48 overflow-auto">
                                        {filteredCategories.length ? (
                                            filteredCategories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setCategoryId(cat.id)
                                                        setCategorySearch('')
                                                        setShowCategoryDropdown(false)
                                                    }}
                                                    className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[color:var(--paper-strong)] ${
                                                        categoryId === cat.id ? 'bg-[color:var(--paper-strong)]' : ''
                                                    }`}
                                                >
                                                    <span className="text-xs text-[color:var(--ink-soft)] mr-1">{cat.prefix}</span>
                                                    <span className="text-[color:var(--ink)]">{cat.name}</span>
                                                    <span className="ml-auto text-xs text-[color:var(--ink-soft)]">{cat.path}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-[color:var(--ink-soft)]">暂无匹配分类</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {selectedCategory ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full bg-[color:var(--paper)] border border-[color:var(--card-border)] text-[color:var(--ink-muted)]"
                                    >
                                        {selectedCategory.path || selectedCategory.name}
                                        <button
                                            type="button"
                                            className="ml-1 text-xs text-[#b91c1c] hover:text-[#991b1b]"
                                            onClick={() => setCategoryId(undefined)}
                                        >
                                            x
                                        </button>
                                    </Badge>
                                ) : (
                                    <span className="text-xs text-[color:var(--ink-soft)]">未选择分类</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-[color:var(--ink-muted)]">标签</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="rounded-full bg-[color:var(--paper)] border border-[color:var(--card-border)] text-[color:var(--ink-muted)]"
                                    >
                                        {tag.name}
                                        <button
                                            type="button"
                                            className="ml-1 text-xs text-[#b91c1c] hover:text-[#991b1b]"
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            x
                                        </button>
                                    </Badge>
                                ))}
                                {!selectedTags.length && <span className="text-xs text-[color:var(--ink-soft)]">未选择标签</span>}
                            </div>

                            <div className="grid gap-2 max-h-36 overflow-auto border border-[color:var(--card-border)] rounded-md p-2 bg-[color:var(--paper)]">
                                {tagsQuery.data?.map((tag) => (
                                    <label key={tag.id} className="flex items-center gap-2 text-sm text-[color:var(--ink-muted)]">
                                        <input
                                            type="checkbox"
                                            checked={tagIds.includes(tag.id)}
                                            onChange={() => toggleTag(tag.id)}
                                        />
                                        {tag.name}
                                    </label>
                                ))}
                                {!tagsQuery.data?.length && <p className="text-xs text-[color:var(--ink-soft)]">暂无可选标签</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function extractTitle(text: string) {
    const lines = text.split(/\r?\n/).map((l) => l.trim())
    const heading = lines.find((l) => l.startsWith('# '))
    if (heading) return heading.replace(/^#\s*/, '')
    return lines.find((l) => l.length > 0) || ''
}

function extractSummary(text: string) {
    const clean = text.replace(/[#*>`_-]/g, ' ').replace(/\s+/g, ' ').trim()
    return clean.slice(0, 120)
}
