import { redirect } from 'next/navigation'
import ItemsAdminClient from '@/components/AdminItemsClient'

function isAdminUser() {
  const isDev = process.env.NODE_ENV === 'development'
  const adminAccess = process.env.ADMIN_ACCESS === 'true'
  return isDev || adminAccess
}

export default function AdminItemsPage() {
  if (!isAdminUser()) {
    redirect('/')
  }
  return (
    <div>
      <ItemsAdminClient />
    </div>
  )
}

export const dynamic = 'force-dynamic'


