import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ClubBottomNav } from '../category-policy/ClubBottomNav'
import { Notice } from '../venues/ClubVenuesPage'
import backIcon from '@/assets/venues/back.svg'

export const field = 'mt-2 h-14 rounded-lg border-[#929195] bg-[#fefefe] px-4 text-sm shadow-none'
export const primary = 'h-12 w-full rounded-lg'
export const secondary = 'h-12 rounded-lg border-0 bg-[#f8f8e9] text-[#646707] hover:bg-[#eef0c1]'
export const danger = 'h-12 rounded-lg border-0 bg-[#fdecec] text-[#b51e15] hover:bg-[#fac5c5]'

export function Shell({ title, children, footer, back, headerAction, hub = false, wizard = false }: {
  title: string; children: ReactNode; footer?: ReactNode; back?: () => void; headerAction?: ReactNode; hub?: boolean; wizard?: boolean
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const initials = [user?.firstName, user?.lastName].map(name => name?.[0] ?? '').join('')
  return <div className="flex h-dvh flex-col bg-[#f6f6f6] text-[#120f18]">
    <header className="shrink-0 bg-[#120f18] text-[#fefefe]">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-4">
        {back && <button type="button" onClick={back} aria-label="Volver" className="flex h-10 w-8 items-center justify-center"><img src={backIcon} alt="" /></button>}
        <h1 className="flex-1 truncate text-xl font-bold">{title}</h1>
        {headerAction}
        {!back && initials && <span className="mr-1 flex size-8 items-center justify-center rounded-full bg-[#c9cf38] text-xs font-medium text-[#120f18]">{initials}</span>}
      </div>
    </header>
    <main className={'flex-1 overflow-y-auto ' + (wizard ? 'bg-[#fefefe]' : '')}>
      <div className={'mx-auto flex max-w-xl flex-col pb-6 ' + (hub ? 'gap-7 pt-5 ' : 'gap-4 pt-6 ') + (wizard ? 'px-8' : 'px-4')}>{children}</div>
    </main>
    {footer && <footer className={'shrink-0 px-8 pb-6 pt-4 ' + (wizard ? 'bg-[#fefefe]' : '')}>
      <div className="mx-auto max-w-[32rem]">{footer}</div>
    </footer>}
    {!wizard && <ClubBottomNav selectedLabel="Eventos" onDashboard={() => navigate('/app')} onClub={() => navigate('/club/settings')} />}
  </div>
}

export function Retry({ children, retry }: { children: ReactNode; retry: () => void }) {
  return <Notice error>{children} <button type="button" className="font-semibold underline" onClick={retry}>Reintentar</button></Notice>
}
