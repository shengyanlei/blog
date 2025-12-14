import { Link } from 'react-router-dom'

export default function ArchivePage() {
    return (
        <div className="container max-w-4xl px-4 py-10 space-y-4">
            <h1 className="text-3xl font-bold">文章归档</h1>
            <p className="text-muted-foreground">归档页面正在建设中，先去看看最新的文章吧。</p>
            <Link to="/" className="text-pink-500 hover:underline">
                返回首页
            </Link>
        </div>
    )
}
