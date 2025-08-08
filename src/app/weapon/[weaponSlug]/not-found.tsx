import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-white">Weapon Not Found</h1>
        <p className="text-gray-400 mb-6">
          The weapon you&apos;re looking for doesn&apos;t exist or the URL is incorrect.
        </p>
        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            ← Back to Home
          </Link>
          <div className="text-sm text-gray-500">
            <p>If you think this is an error, please check the weapon name spelling.</p>
          </div>
        </div>
      </div>
    </div>
  )
}