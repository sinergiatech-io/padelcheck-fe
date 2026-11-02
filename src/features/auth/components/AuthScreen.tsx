import { useState, type ReactNode } from 'react'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'

export function AuthScreen({ children, recovery = false }: { children: ReactNode; recovery?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false)
  return (
    <div className={`flex justify-center bg-[#120F18] ${recovery ? 'h-[100dvh] min-h-[400px] md:h-auto md:min-h-screen' : 'min-h-screen'}`}>
      <div className={`flex w-full max-w-[402px] flex-col ${recovery ? 'h-full min-h-0 pt-[env(safe-area-inset-top)] md:h-auto md:min-h-screen' : 'min-h-screen'}`}>
        <div className="relative flex h-[148px] shrink-0 items-center justify-center overflow-hidden">
          <img src={court} alt="" className="absolute left-0 top-0 h-[172px] w-full" />
          {logoFailed ? <span className="relative text-2xl font-semibold text-primary-500">Padel Check</span> : (
            <img src={logo} alt="Padel Check" className="relative h-[90.695px] w-[92px] object-contain" onError={() => setLogoFailed(true)} />
          )}
        </div>
        <div className={`flex flex-1 flex-col rounded-t-3xl bg-[#FEFEFE] px-4 pt-6 ${recovery ? 'min-h-0 gap-6 overflow-auto pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-[58px]' : 'pb-[58px]'}`}>{children}</div>
      </div>
    </div>
  )
}
