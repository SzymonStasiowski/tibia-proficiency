import { redirect } from 'next/navigation'
import AdminCharmsClient from '@/components/AdminCharmsClient'

function isAdminUser() {
  const isDev = process.env.NODE_ENV === 'development'
  // Align with existing admin gate pattern
  // @ts-ignore - assume a project-level adminAccess is available similarly to items page
  const adminAccess = (global as any).adminAccess || process.env.ADMIN_ACCESS === '1'
  return isDev || adminAccess
}

export default function AdminCharmsPage() {
  if (!isAdminUser()) {
    redirect('/')
  }
  return (
    <div>
      <AdminCharmsClient />
    </div>
  )
}

export const dynamic = 'force-dynamic'


