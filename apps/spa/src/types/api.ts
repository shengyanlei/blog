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

export interface JourneyLocation {
    id: number;
    province: string;
    city: string;
    visitCount?: number;
    photoCount?: number;
    lastVisited?: string;
    coverUrl?: string;
}

export interface JourneyPhoto {
    id?: number;
    url: string;
    shotAt?: string;
    trip?: string;
    note?: string;
    tags?: string;
    cover?: boolean;
    province?: string;
    city?: string;
}

export interface TravelJourneySummary {
    id: number;
    title: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    tags?: string;
    coverUrl?: string;
    cities: string[];
    photoCount: number;
}

export interface TravelJourneyDetail extends TravelJourneySummary {
    content?: string;
    companions?: string;
    budgetMin?: number;
    budgetMax?: number;
    locations: JourneyLocation[];
    photos: JourneyPhoto[];
}

export type TravelPlanStatus = 'IDEA' | 'PLANNING' | 'BOOKED' | 'DONE' | 'CANCELED';
export type TravelPlanPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface TravelPlanTask {
    id?: number;
    title: string;
    done?: boolean;
    sortOrder?: number;
}

export interface TravelPlan {
    id: number;
    title: string;
    province: string;
    city: string;
    startDate?: string;
    endDate?: string;
    status: TravelPlanStatus;
    priority: TravelPlanPriority;
    budgetMin?: number;
    budgetMax?: number;
    tags?: string;
    notes?: string;
    linkedJourneyId?: number;
    linkedJourneyTitle?: string;
    tasks: TravelPlanTask[];
    createdAt?: string;
    updatedAt?: string;
}

export interface UnassignedLocationAsset {
    locationId: number;
    country?: string;
    province: string;
    city: string;
    addressDetail?: string;
    fullAddress?: string;
    photoCount?: number;
    photos: JourneyPhoto[];
}

export interface PendingAssetPhoto {
    photoId: number;
    url: string;
    shotAt?: string;
    uploadedAt?: string;
    note?: string;
    tags?: string;
    bound: boolean;
    locationId?: number;
    country?: string;
    province?: string;
    city?: string;
    addressDetail?: string;
    fullAddress?: string;
}

export type AssetPendingScope = 'ALL' | 'PENDING' | 'BOUND';

export interface BindPendingToPlanRequest {
    photoIds: number[];
    planId: number;
}

export interface BindPendingToJourneyRequest {
    photoIds: number[];
    journeyId: number;
    locationId?: number;
}

export interface BindPendingToAddressRequest {
    photoIds: number[];
    address: {
        country: string;
        province: string;
        city: string;
        addressDetail?: string;
    };
}

export interface BindPendingResult {
    boundCount: number;
    reboundCount: number;
    skippedCount: number;
    locationId?: number;
    country?: string;
    province?: string;
    city?: string;
    addressDetail?: string;
    fullAddress?: string;
}

export type AssetUploadJobStatus = 'pending' | 'uploading' | 'success' | 'failed';

export interface AssetUploadJob {
    localId: string;
    name: string;
    size: number;
    status: AssetUploadJobStatus;
    error?: string;
}

export interface AssetSelectionState {
    selectedPhotoIds: number[];
    totalSelected: number;
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
