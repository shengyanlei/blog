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
import ArticleManagerPage from '../pages/admin/ArticleManagerPage'
import ArticleEditorPage from '../pages/admin/ArticleEditorPage'
import ArticleUploadPage from '../pages/admin/ArticleUploadPage'
import TagManagerPage from '../pages/admin/TagManagerPage'
import CategoryManagerPage from '../pages/admin/CategoryManagerPage'
import CommentManagerPage from '../pages/admin/CommentManagerPage'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <RootLayout />,
        children: [
            {
                path: '/',
                element: <PublicLayout />,
                children: [
                    {
                        index: true,
                        element: <HomePage />,
                    },
                    {
                        path: '/post/*',
                        element: <ArticleDetailPage />,
                    },
                    {
                        path: '/about',
                        element: <AboutPage />,
                    },
                    {
                        path: '/archive',
                        element: <ArchivePage />,
                    },
                    // Add other public routes here
                ],
            },
            {
                path: '/admin/login',
                element: <LoginPage />,
            },
            {
                path: '/admin',
                element: <AdminLayout />,
                children: [
                    {
                        path: 'dashboard',
                        element: <DashboardPage />,
                    },
                    {
                        path: 'articles',
                        element: <ArticleManagerPage />,
                    },
                    {
                        path: 'comments',
                        element: <CommentManagerPage />,
                    },
                    {
                        path: 'write',
                        element: <ArticleEditorPage />,
                    },
                    {
                        path: 'upload',
                        element: <ArticleUploadPage />,
                    },
                    {
                        path: 'tags',
                        element: <TagManagerPage />,
                    },
                    {
                        path: 'categories',
                        element: <CategoryManagerPage />,
                    },
                    // Add other admin routes here
                ],
            },
        ],
    },
])
