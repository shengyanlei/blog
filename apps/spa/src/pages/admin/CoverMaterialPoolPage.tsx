import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { CoverMaterial, PageResult } from '../../types/api'
import { resolveMediaUrl } from '../../lib/mediaUrl'

const PAGE_SIZE = 24

export default function CoverMaterialPoolPage() {
    const qc = useQueryClient()
    const [searchInput, setSearchInput] = useState('')
    const [page, setPage] = useState(0)
    const searchText = searchInput.trim()
    const searchPhotoId = useMemo(() => {
        if (!searchText) return undefined
        if (!/^\d+$/.test(searchText)) return undefined
        const parsed = Number(searchText)
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
    }, [searchText])
    const searchInvalid = Boolean(searchText) && searchPhotoId === undefined

    const listQuery = useQuery({
        queryKey: ['cover-material-list', page, searchPhotoId],
        queryFn: async () => {
            const res = await api.get<ApiResponse<PageResult<CoverMaterial>>>('/cover-materials', {
                params: {
                    page,
                    size: PAGE_SIZE,
                    photoId: searchPhotoId,
                },
            })
            return unwrapResponse(res.data)
        },
    })

    const uploadMutation = useMutation({
        mutationFn: async (files: File[]) => {
            const formData = new FormData()
            files.forEach((file) => formData.append('files', file))
            const res = await api.post<ApiResponse<CoverMaterial[]>>('/cover-materials/upload', formData)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['cover-material-list'] })
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '素材上传失败')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (photoId: number) => {
            const res = await api.delete<ApiResponse<void>>(`/cover-materials/${photoId}`)
            return unwrapResponse(res.data)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['cover-material-list'] })
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || error?.message || '素材删除失败')
        },
    })

    const data = listQuery.data
    const items = data?.content ?? []
    const totalPages = data?.totalPages ?? 0

    return (
        <div className="space-y-6">
            <div>
                <h1 className="mb-2 text-3xl font-display font-semibold text-[color:var(--ink)]">素材池</h1>
                <p className="text-[color:var(--ink-muted)]">封面素材独立管理页。仅这里的图片可作为文章封面使用。</p>
            </div>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                <CardHeader>
                    <CardTitle>上传素材</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => {
                            const fileList = event.target.files
                            if (!fileList?.length) return
                            const files = Array.from(fileList)
                            uploadMutation.mutate(files)
                            event.target.value = ''
                        }}
                    />
                    <p className="text-xs text-[color:var(--ink-soft)]">
                        支持多图上传，上传后可在写文章和上传文章中按编号搜索并选择封面。
                    </p>
                </CardContent>
            </Card>

            <Card className="border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                <CardHeader className="space-y-3">
                    <CardTitle>素材列表</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            value={searchInput}
                            onChange={(event) => {
                                setSearchInput(event.target.value)
                                setPage(0)
                            }}
                            placeholder="按编号搜索，例如 128"
                            className="h-9 w-56 bg-[color:var(--paper)] border-[color:var(--card-border)]"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-[color:var(--card-border)]"
                            onClick={() => {
                                setSearchInput('')
                                setPage(0)
                            }}
                            disabled={!searchInput.trim()}
                        >
                            清空
                        </Button>
                    </div>
                    {searchInvalid && <p className="text-xs text-[#b91c1c]">请输入纯数字编号进行搜索。</p>}
                </CardHeader>
                <CardContent className="space-y-4">
                    {listQuery.isLoading && <p className="text-sm text-[color:var(--ink-soft)]">加载中...</p>}

                    {!listQuery.isLoading && (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {items.map((item) => (
                                <div
                                    key={item.photoId}
                                    className="overflow-hidden rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper)]"
                                >
                                    <img src={resolveMediaUrl(item.url)} alt={`素材 ${item.photoId}`} className="h-28 w-full object-cover" />
                                    <div className="space-y-2 p-2">
                                        <div className="flex items-center justify-between text-xs text-[color:var(--ink-soft)]">
                                            <span>#{item.photoId}</span>
                                            <Badge variant={item.usedAsCover ? 'secondary' : 'outline'}>
                                                {item.usedAsCover ? '已使用' : '未使用'}
                                            </Badge>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-[color:var(--card-border)]"
                                            onClick={() => {
                                                if (!confirm(`确认删除素材 #${item.photoId} 吗？`)) return
                                                deleteMutation.mutate(item.photoId)
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            删除
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {!items.length && (
                                <div className="col-span-full rounded-xl border border-dashed border-[color:var(--card-border)] px-3 py-8 text-center text-sm text-[color:var(--ink-soft)]">
                                    暂无素材
                                </div>
                            )}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(0, prev - 1))} disabled={page === 0}>
                                上一页
                            </Button>
                            <span className="text-xs text-[color:var(--ink-soft)]">
                                {page + 1} / {Math.max(totalPages, 1)}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                                disabled={page >= totalPages - 1}
                            >
                                下一页
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
