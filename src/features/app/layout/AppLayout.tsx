import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './components/AppSidebar'
import { AppTopbar } from './components/AppTopbar'
import { AppBottomNav } from './components/AppBottomNav'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar mobileOpen={sidebarOpen} onMobileOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 pb-24 md:p-6">
          <Outlet />
        </main>
      </div>
      <AppBottomNav />
    </div>
  )
}
