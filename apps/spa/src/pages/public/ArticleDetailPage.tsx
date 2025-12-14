import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Calendar,
    Eye,
    MessageSquare,
    Send,
    Sparkles,
    User,
    Hash,
    Clock,
    ArrowLeft,
    List,
    ChevronUp,
    Maximize2,
    Minimize2,
} from 'lucide-react'
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import MarkdownPreview from '@uiw/react-markdown-preview'
import '@uiw/react-markdown-preview/markdown.css'
import { api, unwrapResponse } from '../../lib/api'
import type { ApiResponse } from '../../lib/api'
import type { ArticleDetail, Comment } from '../../types/api'

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

type CommentNode = Comment & { children: CommentNode[] }

const buildCommentTree = (items: Comment[]): CommentNode[] => {
    const map = new Map<number, CommentNode>()
    items.forEach((c) => {
        map.set(c.id, { ...c, children: [] })
    })

    const roots: CommentNode[] = []
    map.forEach((node) => {
        if (node.parentId && map.has(node.parentId)) {
            map.get(node.parentId)?.children.push(node)
        } else {
            roots.push(node)
        }
    })

    const sortNodes = (list: CommentNode[], order: 'asc' | 'desc') => {
        list.sort((a, b) => {
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return order === 'desc' ? bt - at : at - bt
        })
        list.forEach((n) => sortNodes(n.children, 'asc'))
    }

    sortNodes(roots, 'desc')
    return roots
}

// --- Hidden Effect Component: Particle Burst ---
const ParticleBurst = ({ x, y }: { x: number; y: number }) => {
    return (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
            {[...Array(15)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ x, y, opacity: 1, scale: 0.8 }}
                    animate={{
                        x: x + (Math.random() - 0.5) * 300,
                        y: y + (Math.random() - 0.5) * 300,
                        opacity: 0,
                        scale: 0,
                        rotate: Math.random() * 720,
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="absolute h-3 w-3 rounded-full shadow-lg"
                    style={{
                        backgroundColor: [
                            '#f472b6', // pink-400
                            '#fb7185', // rose-400
                            '#c084fc', // purple-400
                            '#ffffff', // white
                        ][i % 4],
                    }}
                />
            ))}
        </div>
    )
}

type CommentItemProps = {
    node: CommentNode
    depth?: number
    onReply: (node: Comment) => void
}

const CommentItem = ({ node, depth = 0, onReply }: CommentItemProps) => {
    const indent = Math.min(depth * 16, 64)
    return (
        <div className="space-y-3">
            <div className="flex gap-4" style={{ paddingLeft: indent }}>
                <div className="h-10 w-10 shrink-0 rounded-full bg-pink-50 border border-pink-100 overflow-hidden">
                    <img
                        src={buildAvatarUrl(node.authorName || `comment-${node.id}`)}
                        alt={node.authorName || '匿名用户'}
                        className="h-full w-full object-cover"
                    />
                </div>
                <div className="flex-grow space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{node.authorName || '匿名用户'}</span>
                        <span className="text-xs text-slate-400">
                            {node.createdAt ? new Date(node.createdAt).toLocaleDateString() : ''}
                        </span>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{node.content}</p>
                    <button
                        className="text-xs text-pink-500 hover:text-pink-600"
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
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <h4 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
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
                                className="flex w-full items-center justify-between text-slate-700 hover:text-pink-500"
                            >
                                <span className="truncate">{item.text}</span>
                                <span className="text-xs text-slate-400">{isOpen ? '▾' : '▸'}</span>
                            </button>
                            {isOpen && item.children.length > 0 && (
                                <div className="space-y-1 pl-3 border-l border-slate-100">
                                    {item.children.map((child) => (
                                        <button
                                            key={child.id}
                                            type="button"
                                            onClick={() => onJump(child.id)}
                                            className="block w-full text-left text-slate-600 hover:text-pink-500 truncate"
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
        <div className={isFullscreen ? 'fixed inset-0 z-[80] bg-[#f5f6fa] overflow-auto px-6 pt-24 pb-10' : 'relative group'}>
            <div className={isFullscreen ? 'max-w-6xl mx-auto relative' : 'relative'}>
                <div className="absolute left-4 right-4 top-1 z-30 flex items-center justify-between gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-pink-600 shadow-sm border border-white/60">
                        {language}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                setIsFullscreen((v) => !v)
                            }}
                            className="flex h-8 items-center justify-center rounded-full bg-white/90 px-3 text-xs font-semibold text-pink-600 hover:bg-white transition shadow-sm border border-white/60"
                            aria-label={isFullscreen ? '退出全屏' : '全屏查看'}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={onCopy}
                            className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-semibold text-pink-600 transition-colors hover:bg-white shadow-sm border border-white/60"
                        >
                            {copied ? (
                                <>
                                    <span className="text-green-500">✓</span> Copied
                                </>
                            ) : (
                                "Copy"
                            )}
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

    // Hidden effect state
    const [bursts, setBursts] = useState<{ id: number; x: number; y: number }[]>([])
    const [isScrolled, setIsScrolled] = useState(false)

    // Scroll progress
    const { scrollY, scrollYProgress } = useScroll()
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    })

    // Parallax hero
    const heroY = useTransform(scrollY, [0, 500], [0, 200])
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0])

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

    const handleDoubleClick = (e: React.MouseEvent) => {
        const id = Date.now()
        setBursts((prev) => [...prev, { id, x: e.clientX, y: e.clientY }])
        setTimeout(() => {
            setBursts((prev) => prev.filter((b) => b.id !== id))
        }, 1200)
    }

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
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="h-10 w-10 rounded-full border-2 border-pink-400 border-t-transparent"
                />
            </div>
        )
    }

    if (articleError || !article || !slug) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-slate-50 text-slate-500">
                <p>星球似乎偏离了轨道..(Article not found)</p>
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

    return (
        <div
            className="relative min-h-screen bg-[#F0F2F5] text-slate-900 selection:bg-pink-200 selection:text-pink-900 font-sans"
            onDoubleClick={handleDoubleClick}
        >
            {/* --- Hidden Effects --- */}
            {bursts.map((burst) => (
                <ParticleBurst key={burst.id} x={burst.x} y={burst.y} />
            ))}

            {/* --- Top Progress Bar --- */}
            <motion.div
                className="fixed left-0 top-0 z-[60] h-1 bg-gradient-to-r from-pink-400 via-rose-400 to-purple-500 origin-left"
                style={{ scaleX }}
            />

            {/* --- Navigation --- */}
            <nav className={`fixed left-0 top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-6'}`}>
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-12">
                    <Link
                        to="/"
                        className={`group flex items-center gap-2 text-sm font-medium transition-colors ${isScrolled ? 'text-slate-600 hover:text-pink-500' : 'text-white/80 hover:text-white'}`}
                    >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${isScrolled ? 'border-slate-200 bg-white' : 'border-white/20 bg-white/10'}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span className="font-bold tracking-tight">碎念随风</span>
                    </Link>
                </div>
            </nav>

            {/* --- Hero Banner (Cosmic) --- */}
            <motion.div
                className="relative h-[550px] w-full overflow-hidden bg-slate-900"
                style={{ y: heroY, opacity: heroOpacity }}
            >
                {/* Cosmic Background Layer */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black opacity-80" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay" />

                {/* Stars/Orbs */}
                <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-purple-500/30 blur-[100px]" />
                <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-pink-500/20 blur-[120px]" />

                {/* Hero Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="space-y-6 max-w-4xl"
                    >
                        <div className="flex items-center justify-center gap-3 text-sm font-bold tracking-[0.2em] text-pink-200/80 uppercase">
                            <Sparkles className="h-4 w-4 text-pink-300" />
                            <span>{breadcrumbCategory}</span>
                            <span className="text-white/20">|</span>
                            <span>{formattedDate}</span>
                        </div>

                        <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl drop-shadow-2xl">
                            {article.title}
                        </h1>

                        <p className="mx-auto max-w-3xl text-lg text-white/80 leading-relaxed font-light text-center">
                            {(article.summary && article.summary.trim()) ||
                                '人海未见之时，我亦独行在这城市。 料峭，春醒，酷暑，骤雨，寒意四起，大雁南飞，而后，大雪，寒风， 斗转星移，人间寒暑。'}
                        </p>
                    </motion.div>
                </div>

                {/* Bottom Curvature (Optional "Sheet" effect) */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#F0F2F5] to-transparent" />
            </motion.div>

            {/* --- Content Overlay --- */}
            <main className="relative z-10 mx-auto -mt-20 max-w-[1800px] px-4 md:px-8 pb-24">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[280px_1fr_320px] xl:gap-20">

                    {/* --- Left Column: TOC --- */}
                    <div className="hidden xl:block">
                        <div className="sticky top-24 max-h-[75vh] overflow-y-auto pr-2">
                            {article.content && (
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
                            )}
                        </div>
                    </div>

                    {/* --- Center Column: Article --- */}
                    <div className="min-w-0 space-y-8">
                        <motion.article
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12"
                        >
                            <div
                                ref={markdownRef}
                                className="prose prose-lg prose-slate max-w-none 
                                prose-headings:font-bold prose-headings:text-slate-800 
                                prose-h1:text-center prose-h1:hidden
                                prose-p:text-slate-600 prose-p:leading-8
                                prose-a:text-pink-500 prose-a:no-underline prose-a:font-semibold hover:prose-a:text-pink-600 hover:prose-a:underline
                                prose-blockquote:border-l-4 prose-blockquote:border-pink-300 prose-blockquote:bg-pink-50/50 prose-blockquote:rounded-r-lg
                                prose-img:rounded-2xl prose-img:shadow-md
                                prose-strong:text-slate-900
                                prose-code:bg-slate-100 prose-code:text-pink-600 prose-code:rounded-md
                                prose-li:marker:text-pink-300
                            "
                            >
                                <MarkdownPreview
                                    source={article.content}
                                    className="!bg-transparent !text-slate-700 !font-sans markdown-mac-terminal"
                                    components={{
                                        pre: Pre
                                    }}
                                    wrapperElement={{
                                        "data-color-mode": "light"
                                    }}
                                />
                            </div>

                            {/* Tags Footer */}
                            {article.tags && article.tags.length > 0 && (
                                <div className="mt-12 flex flex-wrap gap-2 pt-8 border-t border-slate-100">
                                    {article.tags.map((tag) => (
                                        <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            className="bg-slate-100 hover:bg-pink-50 text-slate-600 hover:text-pink-600 transition-colors px-3 py-1.5"
                                        >
                                            <Hash className="mr-1 h-3 w-3" /> {tag.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </motion.article>

                        {/* Comments Section */}
                        <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-slate-200/50 md:p-12">
                            <div className="mb-8 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5 text-pink-500" />
                                    评论 <span className="text-slate-400 font-normal text-sm">({comments.length})</span>
                                </h3>
                            </div>

                            {/* Comment Input */}
                            <div className="mb-10 space-y-4">
                                {replyTarget && (
                                    <div className="flex items-center justify-between rounded-xl bg-pink-50 border border-pink-100 px-4 py-2 text-sm text-pink-700">
                                        <span>
                                            正在回复：{replyTarget.authorName || '匿名用户'}（#{replyTarget.id}）
                                        </span>
                                        <button
                                            className="text-pink-600 hover:text-pink-700"
                                            onClick={() => setReplyTarget(null)}
                                        >
                                            取消
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                                        <img src={previewAvatar} alt="评论头像" className="h-full w-full object-cover" />
                                    </div>
                                    <div className="flex-grow space-y-3">
                                        <input
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 transition-all"
                                            placeholder="名称 (选填)"
                                            value={commentAuthor}
                                            onChange={(e) => setCommentAuthor(e.target.value)}
                                        />
                                        <textarea
                                            ref={commentInputRef}
                                            className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-pink-300 focus:bg-white focus:ring-2 focus:ring-pink-100 transition-all resize-y"
                                            placeholder={replyTarget ? `回复 ${replyTarget.authorName || '匿名用户'}...` : '写下你的想法...'}
                                            value={commentContent}
                                            onChange={(e) => setCommentContent(e.target.value)}
                                        />
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={() => submitComment.mutate()}
                                                disabled={submitComment.isPending || !commentContent.trim()}
                                                className="rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-200"
                                            >
                                                <Send className="mr-2 h-4 w-4" /> 发布
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Comments List */}
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
                                    <p className="text-sm text-slate-400 text-center py-4">快来写下第一条评论吧~</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* --- Right Column: Sidebar (Sticky) --- */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-28 space-y-6">

                            {/* Mascot Placeholder */}
                            <div className="relative flex justify-center">
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                    className="relative w-48 h-48"
                                >
                                    {/* Illustration Placeholder - Simulating the 'girl' mascot */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {/* We use a placeholder image from a public anime avatar service to simulate the vibe requested */}
                                        <img
                                            src="https://api.dicebear.com/7.x/notionists/svg?seed=Mascot&backgroundColor=ffdfbf"
                                            alt="Mascot"
                                            className="h-full w-full drop-shadow-2xl"
                                        />
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-md">
                                        欢迎光临 ✨
                                    </div>
                                </motion.div>
                            </div>

                            {/* Stats */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><Eye className="h-4 w-4" /> 阅读</span>
                                    <span className="font-bold text-slate-800">{article.views}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><Clock className="h-4 w-4" /> 时长</span>
                                    <span className="font-bold text-slate-800">{Math.max(1, Math.ceil((article.content?.length || 0) / 500))} min</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> 发布</span>
                                    <span className="font-bold text-slate-800">{formattedDate}</span>
                                </div>
                            </div>

                            {/* Author Card (Mini) */}
                            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                                    <User className="h-6 w-6 text-slate-400" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{article.authorName || 'Admin'}</div>
                                    <div className="text-xs text-slate-400">Content Creator</div>
                                </div>
                            </div>

                        </div>
                    </aside>

                </div>
            </main>

            {/* Scroll to Top */}
            <AnimatePresence>
                {isScrolled && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg hover:bg-pink-600 focus:outline-none"
                    >
                        <ChevronUp className="h-6 w-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    )
}
