import { redirect } from 'next/navigation'
import AdminClient from '@/components/AdminClient'

// Simple auth check - enhance with proper authentication later
function isAdminUser() {
  // Check if we're in development mode or admin access is enabled
  const isDev = process.env.NODE_ENV === 'development'
  const adminAccess = process.env.ADMIN_ACCESS === 'true'
  
  return isDev || adminAccess
}

export default function AdminPage() {
  // Basic protection - you should implement proper authentication
  if (!isAdminUser()) {
    redirect('/')
  }

  return (
    <div>
      <AdminClient />
    </div>
  )
}

export const dynamic = 'force-dynamic'