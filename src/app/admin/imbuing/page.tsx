import { redirect } from 'next/navigation'
import AdminImbuementsClient from '@/components/AdminImbuementsClient'

function isAdminUser() {
  const isDev = process.env.NODE_ENV === 'development'
  const adminAccess = process.env.ADMIN_ACCESS === 'true' || process.env.ADMIN_ACCESS === '1'
  return isDev || adminAccess
}

export default function AdminImbuingPage() {
  if (!isAdminUser()) {
    redirect('/')
  }
  return (
    <div>
      <AdminImbuementsClient />
    </div>
  )
}

export const dynamic = 'force-dynamic'


