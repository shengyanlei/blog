import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { Category, Tag } from '../../types/api'

interface ArticleFormState {
    title: string
    summary: string
    content: string
    categoryId?: number
    tagIds: number[]
}

const initialForm: ArticleFormState = {
    title: '',
    summary: '',
    content: '',
    categoryId: undefined,
    tagIds: [],
}

export default function ArticleEditorPage() {
    const [form, setForm] = useState<ArticleFormState>(initialForm)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [tagSearch, setTagSearch] = useState('')
    const [showTagDropdown, setShowTagDropdown] = useState(false)
    const [categorySearch, setCategorySearch] = useState('')
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

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
    const selectedCategory = useMemo(() => flatCategories.find((c) => c.id === form.categoryId), [flatCategories, form.categoryId])

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return flatCategories
        return flatCategories.filter((c) =>
            (c.name + (c.path || '')).toLowerCase().includes(categorySearch.toLowerCase())
        )
    }, [categorySearch, flatCategories])

    const createMutation = useMutation({
        mutationFn: async (payload: ArticleFormState) => {
            const slug = slugify(payload.title)
            const res = await api.post<ApiResponse<number>>('/articles', {
                ...payload,
                slug,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setForm(initialForm)
            setErrorMsg(null)
            alert('创建成功')
        },
        onError: (err: any) => {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                '创建文章失败，请检查输入（标题需唯一，正文不能为空）'
            setErrorMsg(message)
            alert(message)
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        createMutation.mutate(form)
    }

    const toggleTag = (tagId: number) => {
        setForm((prev) => {
            const exists = prev.tagIds.includes(tagId)
            return {
                ...prev,
                tagIds: exists ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
            }
        })
    }

    const filteredTags = useMemo(() => {
        if (!tagSearch.trim()) return tagsQuery.data ?? []
        return (tagsQuery.data ?? []).filter((tag) =>
            tag.name.toLowerCase().includes(tagSearch.toLowerCase())
        )
    }, [tagSearch, tagsQuery.data])

    return (
        <div className="flex flex-col px-6 pb-12">
            <div className="w-full max-w-6xl mr-auto ml-2">
                <header className="flex items-center justify-between py-3">
                    <div>
                        <p className="text-xs text-muted-foreground">/ 管理后台 / 写文章</p>
                        <h1 className="mt-2 text-4xl font-semibold tracking-tight">写文章</h1>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => handleSubmit(new Event('submit') as any)}
                        disabled={createMutation.isPending}
                        className="bg-black text-white hover:bg-black/90"
                    >
                        {createMutation.isPending ? '创建中...' : '发布'}
                    </Button>
                </header>

                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2 relative">
                            <span>分类</span>
                            <div className="relative">
                                <Input
                                    value={categorySearch}
                                    onChange={(e) => {
                                        setCategorySearch(e.target.value)
                                        setShowCategoryDropdown(true)
                                    }}
                                    onFocus={() => setShowCategoryDropdown(true)}
                                    placeholder="搜索或选择分类"
                                    className="h-9 w-52 text-sm"
                                />
                                {showCategoryDropdown && (
                                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md max-h-48 overflow-auto">
                                        {filteredCategories.length ? (
                                            filteredCategories.map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setForm((prev) => ({ ...prev, categoryId: cat.id }))
                                                        setCategorySearch('')
                                                        setShowCategoryDropdown(false)
                                                    }}
                                                    className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                                        form.categoryId === cat.id ? 'bg-slate-100' : ''
                                                    }`}
                                                >
                                                    <span className="text-xs text-muted-foreground mr-1">
                                                        {cat.prefix}
                                                    </span>
                                                    <span className="text-slate-800">{cat.name}</span>
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
                                            onClick={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    categoryId: undefined,
                                                }))
                                            }
                                        >
                                            x
                                        </button>
                                    </Badge>
                                ) : (
                                    <span className="text-xs text-muted-foreground">未选择分类</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 relative">
                            <span>标签</span>
                            <div className="relative">
                                <Input
                                    value={tagSearch}
                                    onChange={(e) => {
                                        setTagSearch(e.target.value)
                                        setShowTagDropdown(true)
                                    }}
                                    onFocus={() => setShowTagDropdown(true)}
                                    placeholder="搜索或选择标签"
                                    className="h-9 w-48 text-sm"
                                />
                                {showTagDropdown && (
                                    <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md max-h-48 overflow-auto">
                                        {filteredTags.length ? (
                                            filteredTags.map((tag) => (
                                                <button
                                                    key={tag.id}
                                                    type="button"
                                                    onClick={() => {
                                                        toggleTag(tag.id)
                                                        setShowTagDropdown(false)
                                                        setTagSearch('')
                                                    }}
                                                    className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                                        form.tagIds.includes(tag.id) ? 'bg-slate-100' : ''
                                                    }`}
                                                >
                                                    {tag.name}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-xs text-muted-foreground">暂无匹配标签</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {form.tagIds
                                    .map((id) => tagsQuery.data?.find((t) => t.id === id))
                                    .filter(Boolean)
                                    .map((tag) => (
                                        <Badge
                                            key={tag!.id}
                                            variant="secondary"
                                            className="rounded-full bg-white border border-slate-200 text-slate-700"
                                        >
                                            {tag!.name}
                                            <button
                                                type="button"
                                                className="ml-1 text-xs text-red-500 hover:text-red-600"
                                                onClick={() => toggleTag(tag!.id)}
                                            >
                                                x
                                            </button>
                                        </Badge>
                                    ))}
                                {!form.tagIds.length && <span className="text-xs text-muted-foreground">未选择标签</span>}
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-slate-700">当前分类：</span>
                        {selectedCategory ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">
                                {selectedCategory.path ?? selectedCategory.name}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">未选择</span>
                        )}
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <Input
                            required
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="无标题页面"
                            className="border-0 border-b border-transparent text-4xl font-semibold px-1 py-2 focus:border-b focus:border-slate-300 focus-visible:ring-0"
                        />
                        <textarea
                            className="w-full resize-none rounded-md border-0 bg-transparent px-1 py-2 text-base text-slate-600 focus-visible:outline-none focus-visible:ring-0"
                            placeholder="添加摘要..."
                            value={form.summary}
                            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                            rows={2}
                        />
                        <div data-color-mode="light">
                            <MDEditor
                                value={form.content}
                                onChange={(val) => setForm((prev) => ({ ...prev, content: val || '' }))}
                                height={520}
                                textareaProps={{ placeholder: '在这里开始书写正文，支持 Markdown 语法与长段落……' }}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                className="bg-black text-white hover:bg-black/90 min-w-[140px]"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? '创建中...' : '创建文章'}
                            </Button>
                        </div>
                        {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}
                    </form>
                </div>
            </div>
        </div>
    )
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

function flattenCategories(
    tree: Category[] = [],
    depth = 0,
    parentPath = ''
): { id: number; name: string; prefix: string; path?: string; parentId?: number | null }[] {
    const result: { id: number; name: string; prefix: string; path?: string; parentId?: number | null }[] = []
    tree.forEach((c) => {
        const normalizedSlugPath = c.slugPath ? `/${c.slugPath.replace(/^\/+/, '')}` : undefined
        const segment = slugify(c.slugPath?.split('/').pop() ?? c.name)
        const computedPath = normalizedSlugPath ?? (parentPath ? `${parentPath}/${segment}` : `/${segment}`)

        result.push({
            id: c.id,
            name: c.name,
            prefix: `${'|--'.repeat(depth)}${depth ? ' ' : ''}`,
            path: computedPath,
            parentId: c.parentId ?? null,
        })
        if (c.children?.length) {
            result.push(...flattenCategories(c.children, depth + 1, computedPath))
        }
    })
    return result
}
