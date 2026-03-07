import type { SiteConfig } from '../config/siteConfig'

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
    coverPhotoId?: number | null;
    coverImage?: string;
    status: string;
    featuredLevel?: number;
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

export interface CategoryArticleGroup {
    category: Category;
    totalCount: number;
    articles: ArticleSummary[];
}

export interface GuestbookEntry {
    id: number;
    authorName: string;
    location?: string | null;
    content: string;
    status: string;
    createdAt?: string;
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
    enabled: boolean;
    tabCodes: string[];
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

export interface CoverMaterial {
    photoId: number;
    url: string;
    uploadedAt?: string;
    usedAsCover: boolean;
}

export interface UpdatePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface AdminSiteConfigResponse {
    config: SiteConfig;
    sourcePath: string;
    lastModified?: string | null;
    writable: boolean;
    backupPath?: string | null;
}

export interface AdminProfileResponse {
    username: string;
    role: string;
    email: string;
}

export interface AdminAccountSummary {
    id: number;
    username: string;
    email: string;
    role: string;
    enabled: boolean;
    createdAt?: string;
    tabCodes: string[];
}

export interface AdminAccountPermissionOption {
    code: string;
    label: string;
    description: string;
}

export interface AdminAccountCreateRequest {
    username: string;
    email: string;
    password: string;
    enabled: boolean;
    tabCodes: string[];
}

export interface AdminAccountUpdateRequest {
    email: string;
    enabled: boolean;
    tabCodes: string[];
}
