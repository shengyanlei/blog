export interface Category {
    id: number;
    name: string;
    description?: string;
    slugPath?: string;
    parentId?: number | null;
    children?: Category[];
}

export interface Tag {
    id: number;
    name: string;
}

export interface ArticleSummary {
    id: number;
    title: string;
    slug: string;
    summary?: string;
    coverImage?: string;
    status: string;
    views: number;
    publishedAt?: string;
    createdAt?: string;
    authorName?: string;
    category?: Category;
    tags?: Tag[];
}

export interface ArticleDetail extends ArticleSummary {
    content: string;
    updatedAt?: string;
}

export interface Comment {
    id: number;
    content: string;
    authorName: string;
    status: string;
    createdAt?: string;
    parentId?: number | null;
    articleId?: number | null;
    articleTitle?: string | null;
    articleSlug?: string | null;
}

export interface AuthUser {
    id: number;
    username: string;
    role: string;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}

export interface DashboardStats {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    totalComments: number;
    pendingComments: number;
    totalViews: number;
    categoryStats: Record<string, number>;
    topArticles: { id: number; title: string; views: number }[];
}

export interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}
