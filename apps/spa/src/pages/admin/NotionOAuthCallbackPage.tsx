import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'

interface OAuthExchangeResponse {
    successRedirect?: string
}

export default function NotionOAuthCallbackPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState('正在连接 Notion...')

    useEffect(() => {
        const errorParam = params.get('error')
        if (errorParam) {
            const description = params.get('error_description')
            const detail = description ? `${errorParam}: ${decodeURIComponent(description)}` : errorParam
            setError(`Notion 授权失败：${detail}`)
            return
        }

        const code = params.get('code')
        const state = params.get('state')
        if (!code || !state) {
            setError('缺少授权参数，请重新连接 Notion')
            return
        }

        const localState = sessionStorage.getItem('notion_oauth_state')
        if (localState && localState !== state) {
            setError('state 校验失败，请重新连接 Notion')
            return
        }
        if (localState) {
            sessionStorage.removeItem('notion_oauth_state')
        }

        let active = true

        const run = async () => {
            try {
                const res = await api.post<ApiResponse<OAuthExchangeResponse>>('/admin/notion/oauth/exchange', {
                    code,
                    state,
                })
                const data = unwrapResponse(res.data)
                if (!active) return

                setStatus('授权成功，正在跳转...')
                const redirect = data?.successRedirect || '/admin/upload'
                if (redirect.startsWith('http')) {
                    window.location.href = redirect
                    return
                }
                navigate(redirect, { replace: true })
            } catch (err: any) {
                if (!active) return
                const message = err?.response?.data?.message || err?.message || 'Notion 授权失败'
                setError(message)
            }
        }

        run()

        return () => {
            active = false
        }
    }, [params, navigate])

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-md rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_20px_40px_-30px_rgba(31,41,55,0.35)]">
                <h1 className="mb-2 text-xl font-display font-semibold text-[color:var(--ink)]">Notion 授权</h1>
                {error ? (
                    <p className="text-sm text-[#b91c1c]">{error}</p>
                ) : (
                    <p className="text-sm text-[color:var(--ink-muted)]">{status}</p>
                )}
            </div>
        </div>
    )
}
