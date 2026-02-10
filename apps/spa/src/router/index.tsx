import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import PublicLayout from '../layouts/PublicLayout'
import AdminLayout from '../layouts/AdminLayout'
import HomePage from '../pages/public/HomePage'
import LoginPage from '../pages/admin/LoginPage'
import DashboardPage from '../pages/admin/DashboardPage'
import ArticleDetailPage from '../pages/public/ArticleDetailPage'
import AboutPage from '../pages/public/AboutPage'
import ArchivePage from '../pages/public/ArchivePage'
import FootprintPage from '../pages/public/FootprintPage'
import ArticleManagerPage from '../pages/admin/ArticleManagerPage'
import ArticleEditorPage from '../pages/admin/ArticleEditorPage'
import ArticleUploadPage from '../pages/admin/ArticleUploadPage'
import TagManagerPage from '../pages/admin/TagManagerPage'
import CategoryManagerPage from '../pages/admin/CategoryManagerPage'
import CommentManagerPage from '../pages/admin/CommentManagerPage'
import FootprintManagerPage from '../pages/admin/FootprintManagerPage'
import NotionOAuthCallbackPage from '../pages/admin/NotionOAuthCallbackPage'

const defaultError = <div className="p-6 text-red-600">抱歉，页面不存在或发生错误。</div>
const adminError = <div className="p-6 text-red-600">抱歉，后台页面出错或不存在。</div>

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        errorElement: defaultError,
        children: [
            {
                path: '/',
                element: <PublicLayout />,
                errorElement: defaultError,
                children: [
                    { index: true, element: <HomePage /> },
                    { path: '/post/*', element: <ArticleDetailPage /> },
                    { path: '/about', element: <AboutPage /> },
                    { path: '/archive', element: <ArchivePage /> },
                    { path: '/footprint', element: <FootprintPage /> },
                ],
            },
            { path: '/admin/login', element: <LoginPage /> },
            { path: '/admin/notion/callback', element: <NotionOAuthCallbackPage /> },
            {
                path: '/admin',
                element: <AdminLayout />,
                errorElement: adminError,
                children: [
                    { path: 'dashboard', element: <DashboardPage /> },
                    { path: 'articles', element: <ArticleManagerPage /> },
                    { path: 'comments', element: <CommentManagerPage /> },
                    { path: 'write', element: <ArticleEditorPage /> },
                    { path: 'upload', element: <ArticleUploadPage /> },
                    { path: 'tags', element: <TagManagerPage /> },
                    { path: 'categories', element: <CategoryManagerPage /> },
                    { path: 'footprints', element: <FootprintManagerPage /> },
                ],
            },
        ],
    },
])
