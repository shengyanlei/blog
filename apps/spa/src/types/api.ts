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
    commentCount?: number;
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

export interface FootprintPhoto {
    id?: number;
    url: string;
    shotAt?: string;
    trip?: string;
    note?: string;
    tags?: string;
    cover?: boolean;
}

export interface LocationData {
    id?: number;
    province: string;
    city?: string;
    visitedCities?: number;
    visitedCitiesWithPhotos?: number;
    visitCount: number;
    photoCount: number;
    lastVisited?: string;
    tags?: string;
    coverUrl?: string;
    photos?: FootprintPhoto[];
}

export interface ProvinceSummary {
    province: string;
    visitedCities: number;
    visitCount: number;
    photoCount: number;
    lastVisited?: string;
}
