'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { weaponCategories } from '@/lib/mockData'

export default function CategoryPage() {
  const params = useParams()
  const categoryId = params.categoryId as string
  
  const category = weaponCategories.find(cat => cat.id === categoryId)
  
  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Category not found</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">{category.icon}</div>
          <h1 className={`text-4xl font-bold mb-4 ${category.color}`}>
            {category.name}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            {category.weaponCount} weapons available
          </p>
          <span className="inline-block bg-white dark:bg-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm border">
            {category.badge}
          </span>
        </div>

        {/* Coming Soon Content */}
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold mb-4">🚧 Coming Soon!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're working hard to bring you the weapon selection and voting interface for {category.name.toLowerCase()}. 
              This page will feature all {category.weaponCount} weapons in this category with their perk options.
            </p>
            
            <div className="space-y-3 text-left mb-8">
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Weapon gallery with images</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Interactive perk selection</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Community voting results</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-500">✓</span>
                <span>Filter by weapon level & stats</span>
              </div>
            </div>

            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold transition-colors"
            >
              ← Back to Categories
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 