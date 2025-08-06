import { getWeaponsByCategory, getWeaponCategories } from '@/lib/serverQueries'
import CategoryClient from '@/components/CategoryClient'

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params
  
  // Fetch data on the server
  const [initialWeapons, initialCategories] = await Promise.all([
    getWeaponsByCategory(categoryId),
    getWeaponCategories()
  ])



  return (
    <CategoryClient 
      initialWeapons={initialWeapons}
      initialCategories={initialCategories}
    />
  )
}

// Generate static params for all weapon categories
export async function generateStaticParams() {
  try {
    const categories = await getWeaponCategories()
    
    return categories.map((category) => ({
      categoryId: category.id
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
} 