import { useState, type ReactNode } from 'react'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'

export function AuthScreen({ children, recovery = false, identity = false }: { children: ReactNode; recovery?: boolean; identity?: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false)
  return (
    <div className={`flex justify-center bg-[#120F18] ${recovery ? 'h-[100dvh] min-h-[400px] md:h-auto md:min-h-screen' : 'min-h-screen'}`}>
      <div className={`flex w-full max-w-[402px] flex-col ${recovery ? 'h-full min-h-0 pt-[env(safe-area-inset-top)] md:h-auto md:min-h-screen' : 'min-h-screen'}`}>
        <div className={'relative flex shrink-0 items-center justify-center overflow-hidden ' + (identity ? 'h-[203px]' : 'h-[148px]')}>
          <img src={court} alt="" className={'absolute left-0 top-0 w-full ' + (identity ? 'h-full' : 'h-[172px]')} />
          {logoFailed ? <span className="relative text-2xl font-semibold text-primary-500">Padel Check</span> : (
            <img src={logo} alt="Padel Check" className={'relative object-contain ' + (identity ? 'h-[104px] w-[104px]' : 'h-[90.695px] w-[92px]')} onError={() => setLogoFailed(true)} />
          )}
        </div>
        <div className={`flex flex-1 flex-col rounded-t-3xl bg-[#FEFEFE] px-4 ${identity ? "pt-8" : "pt-6"} ${recovery ? 'min-h-0 gap-6 overflow-auto pb-[calc(24px+env(safe-area-inset-bottom))] md:pb-[58px]' : 'pb-[58px]'}`}>{children}</div>
      </div>
    </div>
  )
}
