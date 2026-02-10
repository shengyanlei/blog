import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    ArrowLeft,
    Calendar,
    ChevronUp,
    Clock,
    Eye,
    Hash,
    List,
    MessageSquare,
    Send,
    User,
} from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import MarkdownPreview from '@uiw/react-markdown-preview'
import '@uiw/react-markdown-preview/markdown.css'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleDetail, Comment } from '../../types/api'
import { buildCommentTree, type CommentTreeNode } from '../../lib/commentTree'
import { paperPatternStyle, paperThemeVars } from '../../lib/theme'

const coverImageFor = (seed: number) =>
    `https://images.unsplash.com/photo-1482192596544-9eb780fc7f66?w=1600&q=80&auto=format&fit=crop&sig=${seed}`

// --- Helpers ---
const extractSlugFromPath = (pathname: string, fallback?: string) => {
    const segments = pathname.split('/').filter(Boolean)
    const last = segments.pop()
    return last || fallback || ''
}

const extractCategoryPathFromPathname = (pathname: string) => {
    const segments = pathname.split('/').filter(Boolean)
    if (segments[0] === 'post') segments.shift()
    if (!segments.length) return ''
    segments.pop()
    const joined = segments.join('/')
    return joined ? `/${joined}` : ''
}

const COMMENT_ALIAS_STORAGE_KEY = 'blog-comment-alias'

const buildAvatarUrl = (seed: string) =>
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(seed || 'guest')}`

const loadStoredAlias = () => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(COMMENT_ALIAS_STORAGE_KEY) || ''
}

const persistAlias = (alias: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(COMMENT_ALIAS_STORAGE_KEY, alias)
}

const createAnonymousAlias = () => {
    const number = Math.floor(100000 + Math.random() * 900000)
    const alias = `Guest-${number}`
    persistAlias(alias)
    return alias
}
type CommentNode = CommentTreeNode<Comment>

type CommentItemProps = {
    node: CommentNode
    depth?: number
    onReply: (node: Comment) => void
}

const CommentItem = ({ node, depth = 0, onReply }: CommentItemProps) => {
    const indent = Math.min(depth * 16, 64)
    return (
        <div className="space-y-3">
            <div
                className="flex gap-4 rounded-2xl border border-[color:var(--card-border)] bg-white/70 p-4"
                style={{ paddingLeft: indent }}
            >
                <div className="h-10 w-10 shrink-0 rounded-full bg-[color:var(--paper-strong)] border border-[color:var(--card-border)] overflow-hidden">
                    <img
                        src={buildAvatarUrl(node.authorName || `comment-${node.id}`)}
                        alt={node.authorName || '匿名用户'}
                        className="h-full w-full object-cover"
                    />
                </div>
                <div className="flex-grow space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[color:var(--ink)]">{node.authorName || '匿名用户'}</span>
                        <span className="text-xs text-[color:var(--ink-soft)]">
                            {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : ''}
                        </span>
                    </div>
                    <p className="text-[color:var(--ink-muted)] text-sm leading-relaxed">{node.content}</p>
                    <button
                        className="text-xs text-[color:var(--accent)] hover:text-[color:var(--ink)]"
                        onClick={() => onReply(node)}
                    >
                        回复
                    </button>
                </div>
            </div>
            {node.children.length > 0 && (
                <div className="space-y-3">
                    {node.children.map((child) => (
                        <CommentItem key={child.id} node={child} depth={depth + 1} onReply={onReply} />
                    ))}
                </div>
            )}
        </div>
    )
}

// --- Components ---
type TocChild = { id: string; text: string }
type TocItem = { id: string; text: string; children: TocChild[] }

const TableOfContents = ({
    items,
    expanded,
    onToggle,
    onJump,
}: {
    items: TocItem[]
    expanded: Set<string>
    onToggle: (id: string) => void
    onJump: (id: string) => void
}) => {
    if (!items.length) return null

    return (
        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_20px_40px_-35px_rgba(31,41,55,0.35)] lg:max-h-[calc(100vh-22rem)] lg:overflow-y-auto">
            <h4 className="mb-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                <List className="h-4 w-4" /> 目录
            </h4>
            <div className="space-y-3 text-sm">
                {items.map((item) => {
                    const isOpen = expanded.has(item.id)
                    return (
                        <div key={item.id} className="space-y-1">
                            <button
                                type="button"
                                onClick={() => {
                                    onToggle(item.id)
                                    onJump(item.id)
                                }}
                                className="flex w-full items-center justify-between text-[color:var(--ink)] hover:text-[color:var(--accent)]"
                            >
                                <span className="truncate">{item.text}</span>
                                <span className="text-xs text-[color:var(--ink-soft)]">{isOpen ? '—' : '+'}</span>
                            </button>
                            {isOpen && item.children.length > 0 && (
                                <div className="space-y-1 pl-3 border-l border-[color:var(--card-border)]">
                                    {item.children.map((child) => (
                                        <button
                                            key={child.id}
                                            type="button"
                                            onClick={() => onJump(child.id)}
                                            className="block w-full text-left text-[color:var(--ink-muted)] hover:text-[color:var(--accent)] truncate"
                                        >
                                            {child.text}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// --- Custom Code Block Components ---
const Pre = ({ children, ...props }: React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement>) => {
    const textInput = useRef<HTMLPreElement>(null)
    const [copied, setCopied] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const language = useMemo(() => {
        const node = Array.isArray(children) ? children[0] : children
        if (node && typeof node === 'object' && 'props' in node) {
            const cls = (node as any).props?.className as string | undefined
            if (cls) {
                const match = cls.match(/language-([\w-]+)/)
                if (match) return match[1]
            }
        }
        return 'code'
    }, [children])

    const onCopy = () => {
        if (textInput.current) {
            const code = textInput.current.innerText
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className={isFullscreen ? 'fixed inset-0 z-[80] bg-[color:var(--paper)] overflow-auto px-6 pt-24 pb-10' : 'relative group'}>
            <div className={isFullscreen ? 'max-w-7xl mx-auto relative' : 'relative'}>
                <div className="absolute left-4 right-4 top-1 z-30 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[color:var(--paper-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--accent)] shadow-sm border border-[color:var(--card-border)]">
                        {language}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                setIsFullscreen((v) => !v)
                            }}
                            className="flex h-8 items-center justify-center rounded-full bg-[color:var(--paper-soft)] px-3 text-xs font-semibold text-[color:var(--accent)] hover:bg-white transition shadow-sm border border-[color:var(--card-border)]"
                            aria-label={isFullscreen ? '退出全屏' : '全屏查看'}
                        >
                            {isFullscreen ? '收起' : '放大'}
                        </button>
                        <button
                            onClick={onCopy}
                            className="flex h-8 items-center gap-1.5 rounded-full bg-[color:var(--paper-soft)] px-4 text-xs font-semibold text-[color:var(--accent)] transition-colors hover:bg-white shadow-sm border border-[color:var(--card-border)]"
                        >
                            {copied ? 'OK' : 'Copy'}
                        </button>
                    </div>
                </div>
                <pre
                    ref={textInput}
                    {...props}
                    className={props.className}
                    style={{
                        transition: 'max-height 0.2s ease',
                        maxHeight: isFullscreen ? '80vh' : undefined,
                        paddingTop: isFullscreen ? '7.5rem' : '5rem',
                        paddingLeft: '1.5rem',
                        paddingRight: '1.5rem',
                    }}
                >
                    {children}
                </pre>
            </div>
        </div>
    )
}
export default function ArticleDetailPage() {
    const location = useLocation()
    const params = useParams()
    const slug = useMemo(() => extractSlugFromPath(location.pathname, params.slug), [location.pathname, params.slug])
    const derivedCategoryPath = useMemo(() => extractCategoryPathFromPathname(location.pathname), [location.pathname])
    const queryClient = useQueryClient()
    const [commentAuthor, setCommentAuthor] = useState('')
    const [commentContent, setCommentContent] = useState('')
    const [anonymousAlias, setAnonymousAlias] = useState('')
    const lastAuthorRef = useRef('')
    const commentInputRef = useRef<HTMLTextAreaElement | null>(null)
    const [replyTarget, setReplyTarget] = useState<Comment | null>(null)
    const markdownRef = useRef<HTMLDivElement | null>(null)
    const [tocItems, setTocItems] = useState<TocItem[]>([])
    const [expandedToc, setExpandedToc] = useState<Set<string>>(new Set())
    const shouldReduceMotion = useReducedMotion()

    const heroMotion = shouldReduceMotion
        ? {}
        : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6 } }

    const { scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    })

    const {
        data: article,
        isLoading: loadingArticle,
        isError: articleError,
    } = useQuery({
        queryKey: ['article', slug],
        enabled: Boolean(slug),
        queryFn: async () => {
            const res = await api.get<ApiResponse<ArticleDetail>>(`/articles/slug/${slug}`)
            return unwrapResponse(res.data)
        },
    })

    const {
        data: comments = [],
        refetch: refetchComments,
    } = useQuery({
        queryKey: ['comments', article?.id],
        enabled: Boolean(article?.id),
        queryFn: async () => {
            const res = await api.get<ApiResponse<Comment[]>>(`/articles/${article?.id}/comments`)
            return unwrapResponse(res.data)
        },
    })

    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 100)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        const storedAlias = loadStoredAlias()
        if (storedAlias) {
            setAnonymousAlias(storedAlias)
            setCommentAuthor((prev) => prev || storedAlias)
        }
    }, [])

    useEffect(() => {
        if (!markdownRef.current) return
        const headingNodes = Array.from(
            markdownRef.current.querySelectorAll<HTMLHeadingElement>('h1, h2')
        )
        const tocList: TocItem[] = []
        let currentTop: TocItem | null = null

        headingNodes.forEach((node, idx) => {
            const text = (node.textContent || '').trim()
            if (!text) return
            const id = `toc-${idx}`
            node.id = id
            if (node.tagName.toLowerCase() === 'h1') {
                currentTop = { id, text, children: [] }
                tocList.push(currentTop)
            } else if (currentTop) {
                currentTop.children.push({ id, text })
            } else {
                currentTop = { id: `fallback-${idx}`, text: '章节', children: [{ id, text }] }
                tocList.push(currentTop)
            }
        })

        setTocItems(tocList)
        setExpandedToc(new Set(tocList.map((t) => t.id)))
    }, [article?.content])
    const resolveAuthorName = () => {
        const trimmed = commentAuthor.trim()
        if (trimmed) return trimmed

        const alias = anonymousAlias || loadStoredAlias() || createAnonymousAlias()
        setAnonymousAlias(alias)
        setCommentAuthor(alias)
        return alias
    }

    const submitComment = useMutation({
        mutationFn: async () => {
            if (!article?.id) return
            const content = commentContent.trim()
            if (!content) return
            const authorName = resolveAuthorName()
            lastAuthorRef.current = authorName
            const res = await api.post<ApiResponse<Comment>>(`/articles/${article.id}/comments`, {
                authorName,
                content,
                parentId: replyTarget?.id ?? undefined,
            })
            return unwrapResponse(res.data)
        },
        onSuccess: (newComment) => {
            setCommentContent('')
            setCommentAuthor((prev) => (prev.trim() ? prev : lastAuthorRef.current))
            queryClient.setQueryData<Comment[] | undefined>(['comments', article?.id], (prev) => {
                if (!newComment) return prev
                if (!prev) return [newComment]
                return [newComment, ...prev]
            })
            setReplyTarget(null)
            refetchComments()
        },
        onError: (error: any) => {
            console.error(error)
            alert('评论提交失败，请稍后重试')
        },
    })

    const previewName = commentAuthor.trim() || anonymousAlias || 'Guest'
    const previewAvatar = buildAvatarUrl(previewName)
    const commentTree = useMemo(() => buildCommentTree(comments), [comments])

    const handleJumpToHeading = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    if (loadingArticle) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[color:var(--paper)]">
                <motion.div
                    animate={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-10 w-10 rounded-full border-2 border-[color:var(--accent)] border-t-transparent"
                />
            </div>
        )
    }

    if (articleError || !article || !slug) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[color:var(--paper)] text-[color:var(--ink-muted)]">
                <p>没有找到对应的文章。</p>
                <Link to="/">
                    <Button variant="outline">Back to Home</Button>
                </Link>
            </div>
        )
    }

    const formattedDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Draft'
    const breadcrumbCategory = article.category?.slugPath
        ? `/${article.category.slugPath}`
        : derivedCategoryPath || article.category?.name || 'Uncategorized'
    const heroImage = article.coverImage || coverImageFor(article.id)
    const readTime = Math.max(1, Math.ceil((article.content?.length || 0) / 500))
    return (
        <div
            className="relative min-h-screen bg-[color:var(--paper)] text-[color:var(--ink)] font-body selection:bg-[color:var(--paper-strong)] selection:text-[color:var(--ink)]"
            style={paperThemeVars}
        >
            <div className="pointer-events-none absolute inset-0 opacity-70" style={paperPatternStyle} />

            <motion.div
                className="fixed left-0 top-0 z-[60] h-1 bg-gradient-to-r from-[color:var(--accent)] via-[color:var(--teal)] to-[color:var(--ink)] origin-left"
                style={{ scaleX }}
            />

            <nav className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-[color:var(--paper-soft)]/90 backdrop-blur border-b border-[color:var(--card-border)] py-3' : 'bg-transparent py-6'}`}>
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
                    <Link
                        to="/"
                        className="group flex items-center gap-2 text-sm font-semibold text-[color:var(--ink)] transition-colors"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]">
                            <ArrowLeft className="h-4 w-4" />
                        </span>
                        <span className="font-display tracking-[0.2em] uppercase">碎念随风</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-4 text-xs text-[color:var(--ink-soft)]">
                        <span>{formattedDate}</span>
                        <span className="h-1 w-1 rounded-full bg-[color:var(--ink-soft)]" />
                        <span>{readTime} min</span>
                        <span className="h-1 w-1 rounded-full bg-[color:var(--ink-soft)]" />
                        <span>{article.views} views</span>
                    </div>
                </div>
            </nav>

            <motion.section {...heroMotion} className="relative px-4 pt-32 pb-16 md:px-10">
                <div className="mx-auto max-w-7xl space-y-8">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[color:var(--ink-soft)]">
                        <span className="rounded-full border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] px-3 py-1 text-[color:var(--ink)]">
                            {breadcrumbCategory}
                        </span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{formattedDate}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{readTime} min read</span>
                    </div>
                    <h1 className="text-[clamp(2.6rem,5vw,4.8rem)] font-display leading-[1.05]">
                        {article.title}
                    </h1>
                    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)]/80 p-5 shadow-[0_18px_36px_-30px_rgba(31,41,55,0.25)]">
                        <div className="grid gap-3 md:grid-cols-[120px_1fr] md:items-start">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[color:var(--ink-soft)]">
                                <span className="h-px w-6 bg-[color:var(--accent)]/60" />
                                摘要
                            </div>
                            <p className="text-base md:text-lg text-[color:var(--ink-muted)] leading-relaxed">
                                {(article.summary && article.summary.trim()) ||
                                    '记录当下的观察与思考，让每次实践都成为新的线索。'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mx-auto mt-8 max-w-5xl">
                    <div className="relative overflow-hidden rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] shadow-[0_22px_50px_-40px_rgba(31,41,55,0.4)]">
                        <div className="relative aspect-[16/9] md:aspect-[21/9]">
                            {heroImage ? (
                                <img
                                    src={heroImage}
                                    alt={article.title}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                            <div className="absolute bottom-5 left-5 flex flex-wrap items-center gap-2 text-xs text-white/80">
                                <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1">
                                    Issue {String(article.id).padStart(2, '0')}
                                </span>
                                <span className="rounded-full border border-white/40 bg-white/10 px-3 py-1">
                                    {article.authorName || 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.section>
            <main className="relative z-10 mx-auto max-w-7xl px-4 pb-24 md:px-10">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
                    <motion.article
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
                        className="rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_28px_55px_-40px_rgba(31,41,55,0.35)] md:p-10"
                    >
                        <div
                            ref={markdownRef}
                            className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-[color:var(--ink)] prose-p:text-[color:var(--ink-muted)] prose-p:leading-8 prose-a:text-[color:var(--teal)] prose-a:no-underline hover:prose-a:text-[color:var(--accent)] hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-[color:var(--teal)]/35 prose-blockquote:bg-[color:var(--paper-strong)]/60 prose-blockquote:rounded-r-lg prose-img:rounded-2xl prose-img:shadow-md prose-strong:text-[color:var(--ink)] prose-code:bg-[color:var(--paper-strong)] prose-code:text-[color:var(--teal)] prose-code:rounded-md prose-li:marker:text-[color:var(--teal)]"
                        >
                            <MarkdownPreview
                                source={article.content}
                                className="!bg-transparent !text-[color:var(--ink-muted)] font-body markdown-paper"
                                components={{
                                    pre: Pre,
                                }}
                                wrapperElement={{
                                    'data-color-mode': 'light',
                                }}
                            />
                        </div>

                        {article.tags && article.tags.length > 0 && (
                            <div className="mt-12 flex flex-wrap gap-2 pt-8 border-t border-[color:var(--card-border)]">
                                {article.tags.map((tag) => (
                                    <Badge
                                        key={tag.id}
                                        variant="secondary"
                                        className="bg-[color:var(--paper-strong)] hover:bg-white text-[color:var(--ink-muted)] hover:text-[color:var(--accent)] transition-colors px-3 py-1.5 border border-[color:var(--card-border)]"
                                    >
                                        <Hash className="mr-1 h-3 w-3" /> {tag.name}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </motion.article>

                    <aside className="flex flex-col gap-6 lg:self-start lg:sticky lg:top-24 lg:min-h-[calc(100vh-7rem)]">
                        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_18px_40px_-35px_rgba(31,41,55,0.3)] space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[color:var(--ink-muted)] flex items-center gap-2"><Eye className="h-4 w-4" /> 阅读</span>
                                <span className="font-semibold text-[color:var(--ink)]">{article.views}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[color:var(--ink-muted)] flex items-center gap-2"><Clock className="h-4 w-4" /> 时长</span>
                                <span className="font-semibold text-[color:var(--ink)]">{readTime} min</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-[color:var(--ink-muted)] flex items-center gap-2"><Calendar className="h-4 w-4" /> 发布</span>
                                <span className="font-semibold text-[color:var(--ink)]">{formattedDate}</span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-5 shadow-[0_18px_40px_-35px_rgba(31,41,55,0.3)] flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-[color:var(--paper-strong)] border border-[color:var(--card-border)] flex items-center justify-center">
                                <User className="h-6 w-6 text-[color:var(--ink-soft)]" />
                            </div>
                            <div>
                                <div className="font-semibold text-[color:var(--ink)]">{article.authorName || 'Admin'}</div>
                                <div className="text-xs text-[color:var(--ink-soft)]">Content Creator</div>
                            </div>
                        </div>

                        {article.content && (
                            <div className="lg:mt-auto">
                                <TableOfContents
                                    items={tocItems}
                                    expanded={expandedToc}
                                    onToggle={(id) => {
                                        const next = new Set(expandedToc)
                                        next.has(id) ? next.delete(id) : next.add(id)
                                        setExpandedToc(next)
                                    }}
                                    onJump={handleJumpToHeading}
                                />
                            </div>
                        )}
                    </aside>
                </div>

                <section className="mt-12 rounded-3xl border border-[color:var(--card-border)] bg-[color:var(--paper-soft)] p-6 shadow-[0_28px_55px_-40px_rgba(31,41,55,0.35)] md:p-10">
                    <div className="mb-8 flex items-center justify-between">
                        <h3 className="text-xl font-display text-[color:var(--ink)] flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-[color:var(--accent)]" />
                            评论 <span className="text-[color:var(--ink-soft)] font-normal text-sm">({comments.length})</span>
                        </h3>
                    </div>

                    <div className="mb-10 space-y-4">
                        {replyTarget && (
                            <div className="flex items-center justify-between rounded-xl bg-[color:var(--paper-strong)] border border-[color:var(--card-border)] px-4 py-2 text-sm text-[color:var(--ink)]">
                                <span>
                                    正在回复：{replyTarget.authorName || '匿名用户'}（#{replyTarget.id}）
                                </span>
                                <button
                                    className="text-[color:var(--accent)] hover:text-[color:var(--ink)]"
                                    onClick={() => setReplyTarget(null)}
                                >
                                    取消
                                </button>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-[color:var(--paper-strong)] border border-[color:var(--card-border)] overflow-hidden">
                                <img src={previewAvatar} alt="评论头像" className="h-full w-full object-cover" />
                            </div>
                            <div className="flex-grow space-y-3">
                                <input
                                    className="w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]/60 focus:bg-white focus:ring-2 focus:ring-[color:var(--accent)]/10 transition-all"
                                    placeholder="名称 (选填)"
                                    value={commentAuthor}
                                    onChange={(e) => setCommentAuthor(e.target.value)}
                                />
                                <textarea
                                    ref={commentInputRef}
                                    className="min-h-[110px] w-full rounded-xl border border-[color:var(--card-border)] bg-[color:var(--paper-strong)] px-4 py-3 text-sm outline-none focus:border-[color:var(--accent)]/60 focus:bg-white focus:ring-2 focus:ring-[color:var(--accent)]/10 transition-all resize-y"
                                    placeholder={replyTarget ? `回复 ${replyTarget.authorName || '匿名用户'}...` : '写下你的想法...'}
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={() => submitComment.mutate()}
                                        disabled={submitComment.isPending || !commentContent.trim()}
                                        className="rounded-full bg-[color:var(--accent)] hover:bg-[#92400e] text-white shadow-lg shadow-amber-200/60"
                                    >
                                        <Send className="mr-2 h-4 w-4" /> 发布
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {commentTree.map((comment) => (
                            <CommentItem
                                key={comment.id}
                                node={comment}
                                onReply={(node) => {
                                    setReplyTarget(node)
                                    setTimeout(() => commentInputRef.current?.focus(), 0)
                                }}
                            />
                        ))}
                        {!commentTree.length && (
                            <p className="text-sm text-[color:var(--ink-soft)] text-center py-4">快来写下第一条评论吧。</p>
                        )}
                    </div>
                </section>
            </main>

            <AnimatePresence>
                {isScrolled && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent)] text-white shadow-lg hover:bg-[#92400e] focus:outline-none"
                    >
                        <ChevronUp className="h-6 w-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    )
}

