import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { isAxiosError } from 'axios'
import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import { useSearchParams } from 'react-router-dom'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleDetail, ArticleSummary, Category, PageResult, Tag } from '../../types/api'
import { flattenCategoryTree } from '../../lib/categoryTree'
import { slugify } from '../../lib/slug'

type EditorMode = 'create' | 'edit'

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

function toFormState(article: ArticleDetail): ArticleFormState {
    return {
        title: article.title ?? '',
        summary: article.summary ?? '',
        content: article.content ?? '',
        categoryId: article.category?.id,
        tagIds: (article.tags ?? []).map((tag) => tag.id),
    }
}

export default function ArticleEditorPage() {
    const queryClient = useQueryClient()
    const [searchParams, setSearchParams] = useSearchParams()

    const [mode, setMode] = useState<EditorMode>('create')
    const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null)
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

    const adminArticlesQuery = useQuery({
        queryKey: ['admin-articles'],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<ArticleSummary>>>('/admin/articles', {
                params: { page: 0, size: 200 },
            })
            return unwrapResponse(res.data)
        },
    })

    const loadDraftMutation = useMutation({
        mutationFn: async (id: number) => {
            try {
                const res = await api.get<ApiResponse<ArticleDetail>>(`/admin/articles/${id}`)
                return unwrapResponse(res.data)
            } catch (error) {
                if (isAxiosError(error) && error.response?.status === 404) {
                    const fallbackRes = await api.get<ApiResponse<ArticleDetail>>(`/articles/${id}`)
                    return unwrapResponse(fallbackRes.data)
                }
                throw error
            }
        },
        onSuccess: (article) => {
            if (article.status !== 'DRAFT') {
                setErrorMsg('仅可编辑取消发布/草稿文章，请先取消发布')
                handleSwitchToCreate()
                return
            }
            setForm(toFormState(article))
            setCategorySearch('')
            setTagSearch('')
            setErrorMsg(null)
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error?.message || '加载草稿失败，请稍后重试'
            setErrorMsg(message)
        },
    })

    const draftArticles = useMemo(() => {
        return (adminArticlesQuery.data?.content ?? []).filter((article) => article.status === 'DRAFT')
    }, [adminArticlesQuery.data])

    const flatCategories = useMemo(() => flattenCategoryTree(categoriesQuery.data ?? []), [categoriesQuery.data])
    const selectedCategory = useMemo(() => {
        return flatCategories.find((category) => category.id === form.categoryId)
    }, [flatCategories, form.categoryId])

    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return flatCategories
        const keyword = categorySearch.toLowerCase()
        return flatCategories.filter((category) =>
            `${category.name}${category.path ?? ''}`.toLowerCase().includes(keyword)
        )
    }, [categorySearch, flatCategories])

    const filteredTags = useMemo(() => {
        if (!tagSearch.trim()) return tagsQuery.data ?? []
        const keyword = tagSearch.toLowerCase()
        return (tagsQuery.data ?? []).filter((tag) => tag.name.toLowerCase().includes(keyword))
    }, [tagSearch, tagsQuery.data])

    const selectedTags = useMemo(
        () => form.tagIds.map((id) => tagsQuery.data?.find((tag) => tag.id === id)).filter(Boolean) as Tag[],
        [form.tagIds, tagsQuery.data]
    )
    const queryArticleId = searchParams.get('articleId')

    const createMutation = useMutation({
        mutationFn: async (payload: ArticleFormState) => {
            const res = await api.post<ApiResponse<number>>('/articles', {
                title: payload.title.trim(),
                slug: slugify(payload.title, 'untitled'),
                summary: payload.summary.trim() || undefined,
                content: payload.content,
                categoryId: payload.categoryId,
                tagIds: payload.tagIds,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setForm(initialForm)
            setErrorMsg(null)
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] })
            alert('文章创建成功')
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error?.message || '创建文章失败，请检查输入'
            setErrorMsg(message)
            alert(message)
        },
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: number; payload: ArticleFormState }) => {
            const res = await api.put<ApiResponse<void>>(`/articles/${id}`, {
                title: payload.title.trim(),
                slug: slugify(payload.title, 'untitled'),
                summary: payload.summary.trim() || undefined,
                content: payload.content,
                categoryId: payload.categoryId,
                tagIds: payload.tagIds,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            setErrorMsg(null)
            queryClient.invalidateQueries({ queryKey: ['admin-articles'] })
            alert('草稿保存成功')
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error?.message || '保存草稿失败'
            setErrorMsg(message)
            alert(message)
        },
    })

    useEffect(() => {
        if (!queryArticleId) return
        if (!adminArticlesQuery.data) return

        const id = Number(queryArticleId)
        if (!Number.isFinite(id) || id <= 0) {
            return
        }

        const targetArticle = adminArticlesQuery.data.content.find((article) => article.id === id)
        if (!targetArticle) {
            setErrorMsg('未找到要编辑的文章')
            return
        }

        if (targetArticle.status !== 'DRAFT') {
            setErrorMsg('仅可编辑取消发布/草稿文章，请先取消发布')
            setMode('create')
            setSelectedArticleId(null)
            const nextParams = new URLSearchParams(searchParams)
            nextParams.delete('articleId')
            setSearchParams(nextParams, { replace: true })
            return
        }

        setMode('edit')
        if (selectedArticleId !== id) {
            setSelectedArticleId(id)
        }
        loadDraftMutation.mutate(id)
    }, [adminArticlesQuery.data, queryArticleId, selectedArticleId, setSearchParams])

    const handleSwitchToCreate = () => {
        setMode('create')
        setSelectedArticleId(null)
        setForm(initialForm)
        setCategorySearch('')
        setTagSearch('')

        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('articleId')
        setSearchParams(nextParams, { replace: true })
    }

    const handleSwitchToEdit = () => {
        setMode('edit')
        setErrorMsg(null)
    }

    const handleSelectDraftArticle = (rawValue: string) => {
        if (!rawValue) {
            setSelectedArticleId(null)
            setForm(initialForm)
            return
        }

        const id = Number(rawValue)
        if (!Number.isFinite(id) || id <= 0) {
            return
        }

        const targetArticle = draftArticles.find((article) => article.id === id)
        if (!targetArticle) {
            setErrorMsg('仅可编辑取消发布/草稿文章')
            return
        }

        setSelectedArticleId(id)
        setMode('edit')
        setErrorMsg(null)

        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('articleId', String(id))
        setSearchParams(nextParams, { replace: true })
        loadDraftMutation.mutate(id)
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

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault()

        if (!form.title.trim()) {
            setErrorMsg('标题不能为空')
            return
        }
        if (!form.content.trim()) {
            setErrorMsg('正文不能为空')
            return
        }

        if (mode === 'edit') {
            if (selectedArticleId === null) {
                setErrorMsg('请先选择草稿文章')
                return
            }
            updateMutation.mutate({ id: selectedArticleId, payload: form })
            return
        }

        createMutation.mutate(form)
    }

    const submitting = createMutation.isPending || updateMutation.isPending
    const loadingDraft = mode === 'edit' && selectedArticleId !== null && loadDraftMutation.isPending

    return (
        <div className="mx-auto max-w-[960px] space-y-6">
            <section className="rounded-[24px] border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[var(--shadow-soft)]">
                <form className="space-y-6 px-6 py-6 sm:px-10 sm:py-8" onSubmit={handleSubmit}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[color:var(--ink-soft)]">/ 管理后台 / 写文章</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" size="sm" variant={mode === 'create' ? 'default' : 'outline'} onClick={handleSwitchToCreate}>
                                新建文章
                            </Button>
                            <Button type="button" size="sm" variant={mode === 'edit' ? 'default' : 'outline'} onClick={handleSwitchToEdit}>
                                再编辑
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={submitting || loadingDraft}
                                className="bg-[color:var(--accent)] text-white hover:bg-[#92400e]"
                            >
                                {submitting ? (mode === 'edit' ? '保存中...' : '创建中...') : mode === 'edit' ? '保存草稿' : '发布'}
                            </Button>
                        </div>
                    </div>

                    {mode === 'edit' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[color:var(--ink)]">选择草稿文章</label>
                            <select
                                value={selectedArticleId ?? ''}
                                onChange={(event) => handleSelectDraftArticle(event.target.value)}
                                className="w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink)]"
                            >
                                <option value="">请选择草稿文章</option>
                                {draftArticles.map((article) => (
                                    <option key={article.id} value={article.id}>
                                        {article.title}
                                    </option>
                                ))}
                            </select>
                            {!draftArticles.length && (
                                <p className="text-xs text-[color:var(--ink-soft)]">当前没有可编辑的草稿文章，请先创建或取消发布。</p>
                            )}
                            {loadingDraft && <p className="text-xs text-[color:var(--ink-soft)]">正在加载草稿内容...</p>}
                        </div>
                    )}

                    <div className="space-y-3">
                        <Input
                            required
                            value={form.title}
                            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="请输入文章标题"
                            className="h-auto min-h-[64px] border-0 border-transparent bg-transparent px-0 py-2 text-5xl font-semibold font-display leading-[1.1] text-[color:var(--ink)] placeholder:text-[color:var(--ink-soft)] focus-visible:ring-0"
                            disabled={loadingDraft}
                        />
                        <textarea
                            className="w-full resize-none border-0 bg-transparent px-0 text-base text-[color:var(--ink-muted)] placeholder:text-[color:var(--ink-soft)] focus-visible:outline-none focus-visible:ring-0"
                            placeholder="添加摘要..."
                            value={form.summary}
                            onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
                            rows={2}
                            disabled={loadingDraft}
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
                                                onChange={(event) => {
                                                    setCategorySearch(event.target.value)
                                                    setShowCategoryDropdown(true)
                                                }}
                                                onFocus={() => setShowCategoryDropdown(true)}
                                                placeholder="搜索或选择分类"
                                                className="h-9 w-60 text-sm bg-[color:var(--paper)] border-[color:var(--card-border)] shadow-sm"
                                                disabled={loadingDraft}
                                            />
                                            {showCategoryDropdown && (
                                                <div className="absolute z-20 mt-1 w-full rounded-md border border-[color:var(--card-border)] bg-[color:var(--paper)] shadow-md max-h-48 overflow-auto">
                                                    {filteredCategories.length ? (
                                                        filteredCategories.map((category) => (
                                                            <button
                                                                key={category.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setForm((prev) => ({ ...prev, categoryId: category.id }))
                                                                    setCategorySearch('')
                                                                    setShowCategoryDropdown(false)
                                                                }}
                                                                className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-[color:var(--paper-strong)] ${
                                                                    form.categoryId === category.id ? 'bg-[color:var(--paper-strong)]' : ''
                                                                }`}
                                                            >
                                                                <span className="mr-1 text-xs text-[color:var(--ink-soft)]">{category.prefix}</span>
                                                                <span className="text-[color:var(--ink)]">{category.name}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-xs text-[color:var(--ink-soft)]">暂无匹配分类</div>
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
                                                        onClick={() => setForm((prev) => ({ ...prev, categoryId: undefined }))}
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
                                                onChange={(event) => {
                                                    setTagSearch(event.target.value)
                                                    setShowTagDropdown(true)
                                                }}
                                                onFocus={() => setShowTagDropdown(true)}
                                                placeholder="搜索或选择标签"
                                                className="h-9 w-56 text-sm bg-[color:var(--paper)] border-[color:var(--card-border)] shadow-sm"
                                                disabled={loadingDraft}
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
                                                                    form.tagIds.includes(tag.id) ? 'bg-[color:var(--paper-strong)]' : ''
                                                                }`}
                                                            >
                                                                {tag.name}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-3 py-2 text-xs text-[color:var(--ink-soft)]">暂无匹配标签</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {selectedTags.map((tag) => (
                                                <Badge
                                                    key={tag.id}
                                                    variant="secondary"
                                                    className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper)] text-[color:var(--ink-muted)]"
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="admin-editor" data-color-mode="light">
                        <MDEditor
                            value={form.content}
                            onChange={(value) => setForm((prev) => ({ ...prev, content: value || '' }))}
                            preview="edit"
                            visibleDragbar={false}
                            height={560}
                            textareaProps={{ placeholder: '在这里开始书写正文，支持 Markdown 语法' }}
                        />
                    </div>

                    {errorMsg && <p className="text-xs text-[#b91c1c]">{errorMsg}</p>}
                </form>
            </section>
        </div>
    )
}
