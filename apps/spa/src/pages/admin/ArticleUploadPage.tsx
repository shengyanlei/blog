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

interface FlatCategory {
    id: number
    name: string
    path: string
    prefix: string
}

export default function ArticleUploadPage() {
    const [fileName, setFileName] = useState<string>('')
    const [content, setContent] = useState<string>('')
    const [title, setTitle] = useState<string>('')
    const [summary, setSummary] = useState<string>('')
    const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
    const [categorySearch, setCategorySearch] = useState('')
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [tagIds, setTagIds] = useState<number[]>([])
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

    const flatCategories = useMemo(() => flattenCategories(categoriesQuery.data ?? []), [categoriesQuery.data])
    const selectedCategory = useMemo(
        () => flatCategories.find((c) => c.id === categoryId),
        [flatCategories, categoryId]
    )
    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return flatCategories
        return flatCategories.filter((c) =>
            (c.name + c.path).toLowerCase().includes(categorySearch.toLowerCase())
        )
    }, [categorySearch, flatCategories])

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                title: title || fileName || '未命名',
                slug: slugify(title || fileName || 'untitled'),
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
            alert(msg)
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

    const canSubmit = content.trim().length > 0 && (title.trim().length > 0 || fileName)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">上传文章</h1>
                    <p className="text-muted-foreground">上传 Markdown (.md) 笔记并一键生成文章。</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_360px]">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileUp className="h-4 w-4" />
                            选择 Markdown 文件
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Input type="file" accept=".md" onChange={handleFileChange} />
                            <p className="text-xs text-muted-foreground">支持 .md 文件，自动提取标题和摘要。</p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">标题</p>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="自动填充自文件名，可自行修改"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">摘要（可选）</p>
                            <textarea
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                                value={summary}
                                onChange={(e) => setSummary(e.target.value)}
                                rows={3}
                                placeholder="自动截取正文前几句话，可自行调整"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">正文预览 (Markdown)</p>
                            <div className="rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700 max-h-96 overflow-auto">
                                {content ? (
                                    <div data-color-mode="light">
                                        <MarkdownPreview source={content} />
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">尚未选择文件</span>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!canSubmit || createMutation.isPending}
                                className="min-w-[140px] bg-black text-white hover:bg-black/90"
                            >
                                {createMutation.isPending ? '上传中...' : '上传并创建'}
                            </Button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
                    </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle>元信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">分类</p>
                            <div className="relative">
                                <Input
                                    value={categorySearch}
                                    onChange={(e) => {
                                        setCategorySearch(e.target.value)
                                        setShowCategoryDropdown(true)
                                    }}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    placeholder="搜索或选择分类"
                                    className="w-full text-sm"
                                />
                                {showCategoryDropdown && (
                                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md max-h-48 overflow-auto">
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
                                                    className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                                        categoryId === cat.id ? 'bg-slate-100' : ''
                                                    }`}
                                                >
                                                    <span className="text-xs text-muted-foreground mr-1">{cat.prefix}</span>
                                                    <span className="text-slate-800">{cat.name}</span>
                                                    <span className="ml-auto text-xs text-muted-foreground">{cat.path}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">暂无匹配分类</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedCategory ? (
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full bg-white border border-slate-200 text-slate-700"
                                    >
                                        {selectedCategory.path || selectedCategory.name}
                                        <button
                                            type="button"
                                            className="ml-1 text-xs text-red-500 hover:text-red-600"
                                            onClick={() => setCategoryId(undefined)}
                                        >
                                            x
                                        </button>
                                    </Badge>
                                ) : (
                                    <span className="text-xs text-muted-foreground">未选择分类</span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-slate-700">标签</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedTags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="rounded-full bg-white border border-slate-200 text-slate-700"
                                    >
                                        {tag.name}
                                        <button
                                            type="button"
                                            className="ml-1 text-xs text-red-500 hover:text-red-600"
                                            onClick={() => toggleTag(tag.id)}
                                        >
                                            x
                                        </button>
                                    </Badge>
                                ))}
                                {!selectedTags.length && <span className="text-xs text-muted-foreground">未选择标签</span>}
                            </div>
                            <div className="grid gap-2 max-h-36 overflow-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                                {tagsQuery.data?.map((tag) => (
                                    <label key={tag.id} className="flex items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={tagIds.includes(tag.id)}
                                            onChange={() => toggleTag(tag.id)}
                                        />
                                        {tag.name}
                                    </label>
                                ))}
                                {!tagsQuery.data?.length && (
                                    <p className="text-xs text-muted-foreground">暂无可选标签</p>
                                )}
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

function slugify(input: string) {
    return input
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

function flattenCategories(categories: Category[], depth = 0): FlatCategory[] {
    const list: FlatCategory[] = []
    categories.forEach((cat) => {
        const path = cat.slugPath ? `/${cat.slugPath}` : cat.name
        list.push({
            id: cat.id,
            name: cat.name,
            path,
            prefix: depth > 0 ? `${'|--'.repeat(depth)} ` : '',
        })
        if (cat.children?.length) {
            list.push(...flattenCategories(cat.children, depth + 1))
        }
    })
    return list
}
