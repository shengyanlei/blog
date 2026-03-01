export interface SiteConfig {
    site: {
        meta: {
            title: string
            subtitle: string
        }
        brand: {
            navName: string
            heroEyebrow: string
            heroTitle: string
            heroDescription: string
            footerText: string
            navLabels: {
                home: string
                about: string
                archive: string
                footprint: string
                admin: string
            }
        }
        profile: {
            name: string
            initials: string
            role: string
            bio: string
            location: string
            expertise: string
            email: string
            tags: string[]
            avatarUrl: string
        }
    }
    about: {
        heading: string
        intro: string
        ctaArchive: string
        ctaContact: string
        focusTitle: string
        focusAreas: Array<{ title: string; description: string }>
        principlesTitle: string
        principles: string[]
        nowTitle: string
        nowList: string[]
        timelineTitle: string
        timeline: Array<{ year: string; title: string; note: string }>
    }
}

type YamlScalar = string | number | boolean | null

interface YamlObject {
    [key: string]: YamlValue
}

type YamlValue = YamlScalar | YamlObject | YamlValue[]

type Token = {
    indent: number
    text: string
    lineNo: number
}

const stripInlineComment = (line: string) => {
    let inSingleQuote = false
    let inDoubleQuote = false

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i]
        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote
            continue
        }
        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote
            continue
        }
        if (char === '#' && !inSingleQuote && !inDoubleQuote) {
            return line.slice(0, i).trimEnd()
        }
    }

    return line
}

const tokenizeYaml = (yamlText: string): Token[] => {
    const normalized = yamlText
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
    const lines = normalized.split('\n')
    const tokens: Token[] = []

    lines.forEach((rawLine, index) => {
        const lineWithoutComment = stripInlineComment(rawLine.replace(/\t/g, '  '))
        if (!lineWithoutComment.trim()) {
            return
        }
        const indent = lineWithoutComment.match(/^ */)?.[0].length ?? 0
        tokens.push({
            indent,
            text: lineWithoutComment.trim(),
            lineNo: index + 1,
        })
    })

    return tokens
}

const parseQuotedString = (value: string) => {
    const first = value[0]
    const last = value[value.length - 1]
    if ((first === '"' || first === "'") && last === first) {
        const inner = value.slice(1, -1)
        return first === '"' ? inner.replace(/\\"/g, '"') : inner.replace(/\\'/g, "'")
    }
    return null
}

const splitInlineArrayItems = (body: string) => {
    const parts: string[] = []
    let current = ''
    let inSingleQuote = false
    let inDoubleQuote = false

    for (let i = 0; i < body.length; i += 1) {
        const char = body[i]
        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote
            current += char
            continue
        }
        if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote
            current += char
            continue
        }
        if (char === ',' && !inSingleQuote && !inDoubleQuote) {
            parts.push(current.trim())
            current = ''
            continue
        }
        current += char
    }

    if (current.trim()) {
        parts.push(current.trim())
    }

    return parts
}

const parseScalar = (value: string): YamlValue => {
    const quoted = parseQuotedString(value)
    if (quoted !== null) {
        return quoted
    }

    if (value.startsWith('[') && value.endsWith(']')) {
        const body = value.slice(1, -1).trim()
        if (!body) {
            return []
        }
        return splitInlineArrayItems(body).map((item) => parseScalar(item))
    }

    if (value === 'true') return true
    if (value === 'false') return false
    if (value === 'null') return null

    if (/^-?\d+(\.\d+)?$/.test(value)) {
        const num = Number(value)
        if (!Number.isNaN(num)) {
            return num
        }
    }

    return value
}

class YamlParser {
    private readonly tokens: Token[]
    private index = 0

    constructor(tokens: Token[]) {
        this.tokens = tokens
    }

    parse(): YamlValue {
        if (!this.tokens.length) {
            return {}
        }
        const rootIndent = this.tokens[0].indent
        const value = this.parseBlock(rootIndent)
        if (this.index < this.tokens.length) {
            const token = this.tokens[this.index]
            throw new Error(`Unexpected token at line ${token.lineNo}`)
        }
        return value
    }

    private peek(): Token | undefined {
        return this.tokens[this.index]
    }

    private parseBlock(indent: number): YamlValue {
        const token = this.peek()
        if (!token) {
            return {}
        }
        if (token.indent < indent) {
            return {}
        }
        if (token.indent > indent) {
            throw new Error(`Invalid indentation at line ${token.lineNo}`)
        }
        if (token.text.startsWith('- ')) {
            return this.parseArray(indent)
        }
        return this.parseObject(indent)
    }

    private parseObject(indent: number, seed: YamlObject = {}): YamlObject {
        const obj: YamlObject = { ...seed }

        while (true) {
            const token = this.peek()
            if (!token || token.indent < indent) {
                break
            }
            if (token.indent > indent) {
                throw new Error(`Invalid indentation at line ${token.lineNo}`)
            }
            if (token.text.startsWith('- ')) {
                break
            }

            const colonIndex = token.text.indexOf(':')
            if (colonIndex <= 0) {
                throw new Error(`Invalid object entry at line ${token.lineNo}`)
            }

            const key = token.text.slice(0, colonIndex).trim()
            const rest = token.text.slice(colonIndex + 1).trim()
            this.index += 1

            if (!rest) {
                const next = this.peek()
                if (next && next.indent > indent) {
                    obj[key] = this.parseBlock(next.indent)
                } else {
                    obj[key] = {}
                }
                continue
            }

            obj[key] = parseScalar(rest)
        }

        return obj
    }

    private parseArray(indent: number): YamlValue[] {
        const items: YamlValue[] = []

        while (true) {
            const token = this.peek()
            if (!token || token.indent < indent) {
                break
            }
            if (token.indent > indent) {
                throw new Error(`Invalid indentation at line ${token.lineNo}`)
            }
            if (!token.text.startsWith('- ')) {
                break
            }

            const rest = token.text.slice(2).trim()
            this.index += 1

            if (!rest) {
                const next = this.peek()
                if (next && next.indent > indent) {
                    items.push(this.parseBlock(next.indent))
                } else {
                    items.push(null)
                }
                continue
            }

            const colonIndex = rest.indexOf(':')
            if (colonIndex > 0) {
                const key = rest.slice(0, colonIndex).trim()
                const valueText = rest.slice(colonIndex + 1).trim()
                const itemObject: YamlObject = {}

                if (!valueText) {
                    const next = this.peek()
                    if (next && next.indent > indent) {
                        itemObject[key] = this.parseBlock(next.indent)
                    } else {
                        itemObject[key] = {}
                    }
                } else {
                    itemObject[key] = parseScalar(valueText)
                }

                const next = this.peek()
                if (next && next.indent > indent) {
                    items.push(this.parseObject(next.indent, itemObject))
                } else {
                    items.push(itemObject)
                }
                continue
            }

            items.push(parseScalar(rest))
        }

        return items
    }
}

const parseYaml = (yamlText: string): unknown => {
    const parser = new YamlParser(tokenizeYaml(yamlText))
    return parser.parse()
}

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined
    }
    return value as Record<string, unknown>
}

const asString = (value: unknown): string | undefined => {
    return typeof value === 'string' ? value : undefined
}

const asStringArray = (value: unknown): string[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined
    }
    const filtered = value.filter((item): item is string => typeof item === 'string')
    return filtered.length ? filtered : undefined
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
    site: {
        meta: {
            title: '碎念随风',
            subtitle: '设计、前端与写作',
        },
        brand: {
            navName: '碎念随风',
            heroEyebrow: 'Glacier Log',
            heroTitle: '霜蓝札记',
            heroDescription: '在设计、代码与慢旅行之间，收集观察与技术笔记。',
            footerText: '© Antigravity 提供技术支持',
            navLabels: {
                home: '首页',
                about: '关于',
                archive: '文章',
                footprint: '足迹',
                admin: '后台管理',
            },
        },
        profile: {
            name: 'shyl',
            initials: 'S',
            role: 'Writer / Engineer',
            bio: '记录技术与生活的交汇。',
            location: '深圳 / 远程协作',
            expertise: '产品体验、设计系统、前端工程',
            email: 'hello@shyl.dev',
            tags: ['Portfolio', 'UI/UX', 'Writing'],
            avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
        },
    },
    about: {
        heading: '关于我',
        intro: '这里放你的个人介绍。',
        ctaArchive: '查看文章',
        ctaContact: '联系我',
        focusTitle: '写作方向',
        focusAreas: [
            {
                title: '产品叙事',
                description: '把产品体验拆成结构化笔记，让灵感可以复用。',
            },
            {
                title: '前端工程',
                description: '从组件到系统，关注可维护与长期演进。',
            },
        ],
        principlesTitle: '工作方式',
        principles: ['用简洁一致的框架记录复杂问题。'],
        nowTitle: '最近在做',
        nowList: ['迭代博客体验与内容结构。'],
        timelineTitle: '时间线',
        timeline: [
            {
                year: '2024',
                title: '持续写作与系统化复盘',
                note: '围绕内容生产与工程效率持续优化。',
            },
        ],
    },
}

let currentSiteConfig: SiteConfig = DEFAULT_SITE_CONFIG

const normalizeSiteConfig = (raw: unknown): SiteConfig => {
    const root = asRecord(raw)
    if (!root) {
        return DEFAULT_SITE_CONFIG
    }

    const site = asRecord(root.site)
    const siteMeta = asRecord(site?.meta)
    const siteBrand = asRecord(site?.brand)
    const navLabels = asRecord(siteBrand?.navLabels)
    const siteProfile = asRecord(site?.profile)
    const about = asRecord(root.about)

    const focusAreasRaw = Array.isArray(about?.focusAreas) ? about?.focusAreas : []
    const focusAreas = focusAreasRaw
        .map((item) => {
            const record = asRecord(item)
            const title = asString(record?.title)
            const description = asString(record?.description)
            if (!title || !description) {
                return null
            }
            return { title, description }
        })
        .filter((item): item is { title: string; description: string } => Boolean(item))

    const timelineRaw = Array.isArray(about?.timeline) ? about?.timeline : []
    const timeline = timelineRaw
        .map((item) => {
            const record = asRecord(item)
            const year = asString(record?.year)
            const title = asString(record?.title)
            const note = asString(record?.note)
            if (!year || !title || !note) {
                return null
            }
            return { year, title, note }
        })
        .filter((item): item is { year: string; title: string; note: string } => Boolean(item))

    return {
        site: {
            meta: {
                title: asString(siteMeta?.title) ?? DEFAULT_SITE_CONFIG.site.meta.title,
                subtitle: asString(siteMeta?.subtitle) ?? DEFAULT_SITE_CONFIG.site.meta.subtitle,
            },
            brand: {
                navName: asString(siteBrand?.navName) ?? DEFAULT_SITE_CONFIG.site.brand.navName,
                heroEyebrow: asString(siteBrand?.heroEyebrow) ?? DEFAULT_SITE_CONFIG.site.brand.heroEyebrow,
                heroTitle: asString(siteBrand?.heroTitle) ?? DEFAULT_SITE_CONFIG.site.brand.heroTitle,
                heroDescription: asString(siteBrand?.heroDescription) ?? DEFAULT_SITE_CONFIG.site.brand.heroDescription,
                footerText: asString(siteBrand?.footerText) ?? DEFAULT_SITE_CONFIG.site.brand.footerText,
                navLabels: {
                    home: asString(navLabels?.home) ?? DEFAULT_SITE_CONFIG.site.brand.navLabels.home,
                    about: asString(navLabels?.about) ?? DEFAULT_SITE_CONFIG.site.brand.navLabels.about,
                    archive: asString(navLabels?.archive) ?? DEFAULT_SITE_CONFIG.site.brand.navLabels.archive,
                    footprint: asString(navLabels?.footprint) ?? DEFAULT_SITE_CONFIG.site.brand.navLabels.footprint,
                    admin: asString(navLabels?.admin) ?? DEFAULT_SITE_CONFIG.site.brand.navLabels.admin,
                },
            },
            profile: {
                name: asString(siteProfile?.name) ?? DEFAULT_SITE_CONFIG.site.profile.name,
                initials: asString(siteProfile?.initials) ?? DEFAULT_SITE_CONFIG.site.profile.initials,
                role: asString(siteProfile?.role) ?? DEFAULT_SITE_CONFIG.site.profile.role,
                bio: asString(siteProfile?.bio) ?? DEFAULT_SITE_CONFIG.site.profile.bio,
                location: asString(siteProfile?.location) ?? DEFAULT_SITE_CONFIG.site.profile.location,
                expertise: asString(siteProfile?.expertise) ?? DEFAULT_SITE_CONFIG.site.profile.expertise,
                email: asString(siteProfile?.email) ?? DEFAULT_SITE_CONFIG.site.profile.email,
                tags: asStringArray(siteProfile?.tags) ?? [...DEFAULT_SITE_CONFIG.site.profile.tags],
                avatarUrl: asString(siteProfile?.avatarUrl) ?? DEFAULT_SITE_CONFIG.site.profile.avatarUrl,
            },
        },
        about: {
            heading: asString(about?.heading) ?? DEFAULT_SITE_CONFIG.about.heading,
            intro: asString(about?.intro) ?? DEFAULT_SITE_CONFIG.about.intro,
            ctaArchive: asString(about?.ctaArchive) ?? DEFAULT_SITE_CONFIG.about.ctaArchive,
            ctaContact: asString(about?.ctaContact) ?? DEFAULT_SITE_CONFIG.about.ctaContact,
            focusTitle: asString(about?.focusTitle) ?? DEFAULT_SITE_CONFIG.about.focusTitle,
            focusAreas: focusAreas.length ? focusAreas : [...DEFAULT_SITE_CONFIG.about.focusAreas],
            principlesTitle: asString(about?.principlesTitle) ?? DEFAULT_SITE_CONFIG.about.principlesTitle,
            principles: asStringArray(about?.principles) ?? [...DEFAULT_SITE_CONFIG.about.principles],
            nowTitle: asString(about?.nowTitle) ?? DEFAULT_SITE_CONFIG.about.nowTitle,
            nowList: asStringArray(about?.nowList) ?? [...DEFAULT_SITE_CONFIG.about.nowList],
            timelineTitle: asString(about?.timelineTitle) ?? DEFAULT_SITE_CONFIG.about.timelineTitle,
            timeline: timeline.length ? timeline : [...DEFAULT_SITE_CONFIG.about.timeline],
        },
    }
}

export const getSiteConfig = (): SiteConfig => currentSiteConfig

export const initSiteConfig = async (): Promise<SiteConfig> => {
    try {
        const response = await fetch('/application.yml', { cache: 'no-store' })
        if (!response.ok) {
            throw new Error(`Failed to load application.yml, status=${response.status}`)
        }
        const rawText = await response.text()
        const parsed = parseYaml(rawText)
        const root = asRecord(parsed)
        if (!root || !asRecord(root.site) || !asRecord(root.about)) {
            throw new Error('Invalid application.yml root keys: missing site/about')
        }
        currentSiteConfig = normalizeSiteConfig(parsed)
        return currentSiteConfig
    } catch (error) {
        console.warn('[site-config] Failed to load runtime YAML. Falling back to defaults.', error)
        currentSiteConfig = DEFAULT_SITE_CONFIG
        return currentSiteConfig
    }
}
