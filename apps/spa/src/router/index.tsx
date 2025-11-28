import { createBrowserRouter } from 'react-router-dom'
import RootLayout from '../layouts/RootLayout'
import PublicLayout from '../layouts/PublicLayout'
import AdminLayout from '../layouts/AdminLayout'
import HomePage from '../pages/public/HomePage'
import LoginPage from '../pages/admin/LoginPage'
import DashboardPage from '../pages/admin/DashboardPage'

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
                    // Add other public routes here
                ],
            },
            {
                path: '/admin',
                element: <AdminLayout />,
                children: [
                    {
                        path: 'login',
                        element: <LoginPage />,
                    },
                    {
                        path: 'dashboard',
                        element: <DashboardPage />,
                    },
                    // Add other admin routes here
                ],
            },
        ],
    },
])
