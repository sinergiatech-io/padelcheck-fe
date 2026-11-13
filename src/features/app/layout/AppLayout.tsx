import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { ClubBottomNav } from '@/features/club/category-policy/ClubBottomNav'
import { useAuth } from '@/context/AuthContext'
import { AppSidebar } from './components/AppSidebar'
import { AppTopbar } from './components/AppTopbar'
import { AppBottomNav } from './components/AppBottomNav'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { destination } = useAuth()
  const navigate = useNavigate()
  const playerShell = destination?.kind === 'player'

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className={playerShell || destination?.kind === 'club' ? 'flex-1 p-4 pb-24 md:p-6' : 'flex-1 p-4 md:p-6'}>
          <Outlet />
        </main>
      </div>
      {playerShell ? <AppBottomNav /> : null}
      {destination?.kind === 'club' && <div className="fixed inset-x-0 bottom-0 md:hidden"><ClubBottomNav selectedLabel="Dashboard" onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} /></div>}
    </div>
  )
}
