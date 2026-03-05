import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card'
import { Input } from '@repo/ui/components/ui/input'
import { Badge } from '@repo/ui/components/ui/badge'
import { api, REQUEST_TIMEOUT, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { CoverMaterial, PageResult } from '../../types/api'
import { resolveMediaUrl } from '../../lib/mediaUrl'

const PAGE_SIZE = 24
const UPLOAD_BATCH_MAX_FILES = 10
const UPLOAD_BATCH_MAX_BYTES = 12 * 1024 * 1024
const UPLOAD_BATCH_CONCURRENCY = 2
const UPLOAD_BATCH_RETRIES = 2

const isRetryableUploadError = (error: any) => {
    const status = error?.response?.status
    if (status === 429) return true
    if (typeof status === 'number' && status >= 500) return true
    return error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK'
}

const buildUploadBatches = (files: File[]) => {
    const batches: File[][] = []
    let currentBatch: File[] = []
    let currentBytes = 0

    for (const file of files) {
        const exceedFileLimit = currentBatch.length >= UPLOAD_BATCH_MAX_FILES
        const exceedByteLimit = currentBytes + file.size > UPLOAD_BATCH_MAX_BYTES

        if (currentBatch.length > 0 && (exceedFileLimit || exceedByteLimit)) {
            batches.push(currentBatch)
            currentBatch = []
            currentBytes = 0
        }

        currentBatch.push(file)
        currentBytes += file.size
    }

    if (currentBatch.length > 0) {
        batches.push(currentBatch)
    }

    return batches
}

const uploadBatchWithRetry = async (batch: File[]) => {
    let lastError: any
    for (let attempt = 0; attempt <= UPLOAD_BATCH_RETRIES; attempt += 1) {
        const formData = new FormData()
        batch.forEach((file) => formData.append('files', file))
        try {
            const res = await api.post<ApiResponse<CoverMaterial[]>>('/cover-materials/upload', formData, {
                timeout: REQUEST_TIMEOUT.upload,
            })
            return unwrapResponse(res.data)
        } catch (error: any) {
            lastError = error
            if (!isRetryableUploadError(error) || attempt >= UPLOAD_BATCH_RETRIES) {
                break
            }
            await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
        }
    }
    throw lastError
}

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
            const batches = buildUploadBatches(files)
            let cursor = 0
            const uploaded: CoverMaterial[] = []

            const worker = async () => {
                while (true) {
                    const index = cursor
                    cursor += 1
                    if (index >= batches.length) {
                        break
                    }
                    const batchResult = await uploadBatchWithRetry(batches[index])
                    uploaded.push(...batchResult)
                }
            }

            const workerCount = Math.min(UPLOAD_BATCH_CONCURRENCY, batches.length)
            await Promise.all(Array.from({ length: workerCount }, () => worker()))
            return uploaded
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
                        支持多图上传；每批最多 {UPLOAD_BATCH_MAX_FILES} 张且不超过 {Math.floor(UPLOAD_BATCH_MAX_BYTES / (1024 * 1024))}
                        MB，失败批次会自动重试。
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
