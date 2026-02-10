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
import { flattenCategoryTree } from '../../lib/categoryTree'
import { slugify } from '../../lib/slug'

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

    const flatCategories = useMemo(() => flattenCategoryTree(categoriesQuery.data ?? []), [categoriesQuery.data])
    const selectedCategory = useMemo(() => flatCategories.find((c) => c.id === form.categoryId), [flatCategories, form.categoryId])

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return flatCategories
        return flatCategories.filter((c) =>
            (c.name + (c.path || '')).toLowerCase().includes(categorySearch.toLowerCase())
        )
    }, [categorySearch, flatCategories])

    const createMutation = useMutation({
        mutationFn: async (payload: ArticleFormState) => {
            const slug = slugify(payload.title, 'untitled')
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
        <div className="mx-auto max-w-[960px] space-y-6">
            <section className="rounded-[24px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[var(--shadow-soft)]">
                <form className="space-y-6 px-6 py-6 sm:px-10 sm:py-8" onSubmit={handleSubmit}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-xs text-[color:var(--ink-soft)]">/ 管理后台 / 写文章</p>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={createMutation.isPending}
                            className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                        >
                            {createMutation.isPending ? '创建中...' : '发布'}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <Input
                            required
                            value={form.title}
                            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="无标题文档"
                            className="h-auto min-h-[64px] border-0 border-transparent bg-transparent px-0 py-2 text-5xl font-semibold font-display leading-[1.1] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus-visible:ring-0"
                        />
                        <textarea
                            className="w-full resize-none border-0 bg-transparent px-0 text-base text-[color:var(--ink-muted)] placeholder:text-[color:var(--ink-soft)] focus-visible:outline-none focus-visible:ring-0"
                            placeholder="添加摘要..."
                            value={form.summary}
                            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                            rows={2}
                        />
                    </div>

                    <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper)]/70 p-4 sm:p-5">
                        <div className="grid gap-5 text-sm text-[color:var(--ink-muted)]">
                            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                                <div className="pt-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    分类
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="relative">
                                            <Input
                                                value={categorySearch}
                                                onChange={(e) => {
                                                    setCategorySearch(e.target.value)
                                                    setShowCategoryDropdown(true)
                                                }}
                                                onFocus={() => setShowCategoryDropdown(true)}
                                                placeholder="搜索或选择分类"
                                                className="h-9 w-60 text-sm bg-[color:var(--paper)] border-[color:var(--card-border)] shadow-sm"
                                            />
                                            {showCategoryDropdown && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] shadow-md max-h-48 overflow-auto">
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
                                                                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[color:var(--paper-strong)] ${
                                                                    form.categoryId === cat.id
                                                                        ? 'bg-[color:var(--paper-strong)]'
                                                                        : ''
                                                                }`}
                                                            >
                                                                <span className="mr-1 text-xs text-[color:var(--ink-soft)]">
                                                                    {cat.prefix}
                                                                </span>
                                                                <span className="text-[color:var(--ink)]">{cat.name}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                                            暂无匹配分类
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {selectedCategory ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper)] text-[color:var(--ink-muted)]"
                                                >
                                                    {selectedCategory.path || selectedCategory.name}
                                                    <button
                                                        type="button"
                                                        className="ml-1 text-xs text-[#b91c1c] hover:text-[#991b1b]"
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
                                                <span className="text-xs text-[color:var(--ink-soft)]">未选择分类</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                                <div className="pt-1 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                                    标签
                                </div>
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="relative">
                                            <Input
                                                value={tagSearch}
                                                onChange={(e) => {
                                                    setTagSearch(e.target.value)
                                                    setShowTagDropdown(true)
                                                }}
                                                onFocus={() => setShowTagDropdown(true)}
                                                placeholder="搜索或选择标签"
                                                className="h-9 w-56 text-sm bg-[color:var(--paper)] border-[color:var(--card-border)] shadow-sm"
                                            />
                                            {showTagDropdown && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] shadow-md max-h-48 overflow-auto">
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
                                                                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[color:var(--paper-strong)] ${
                                                                    form.tagIds.includes(tag.id)
                                                                        ? 'bg-[color:var(--paper-strong)]'
                                                                        : ''
                                                                }`}
                                                            >
                                                                {tag.name}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-xs text-[color:var(--ink-soft)]">
                                                            暂无匹配标签
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {form.tagIds
                                                .map((id) => tagsQuery.data?.find((t) => t.id === id))
                                                .filter(Boolean)
                                                .map((tag) => (
                                                    <Badge
                                                        key={tag!.id}
                                                        variant="secondary"
                                                        className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper)] text-[color:var(--ink-muted)]"
                                                    >
                                                        {tag!.name}
                                                        <button
                                                            type="button"
                                                            className="ml-1 text-xs text-[#b91c1c] hover:text-[#991b1b]"
                                                            onClick={() => toggleTag(tag!.id)}
                                                        >
                                                            x
                                                        </button>
                                                    </Badge>
                                                ))}
                                            {!form.tagIds.length && (
                                                <span className="text-xs text-[color:var(--ink-soft)]">未选择标签</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-editor" data-color-mode="light">
                        <MDEditor
                            value={form.content}
                            onChange={(val) => setForm((prev) => ({ ...prev, content: val || '' }))}
                            preview="edit"
                            visibleDragbar={false}
                            height={560}
                            textareaProps={{ placeholder: '在这里开始书写正文，支持 Markdown 语法与长段落…' }}
                        />
                    </div>

                    {errorMsg && <p className="text-xs text-[#b91c1c]">{errorMsg}</p>}
                </form>
            </section>
        </div>
    )
}
