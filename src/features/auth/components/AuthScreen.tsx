import type { ReactNode } from 'react'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-[#120F18]">
      <div className="flex min-h-screen w-full max-w-[402px] flex-col">
        <div className="relative flex h-[148px] items-center justify-center overflow-hidden">
          <img src={court} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <img src={logo} alt="Padel Check" className="relative h-[91px] w-[92px] object-contain" />
        </div>
        <div className="flex flex-1 flex-col rounded-t-3xl bg-[#FEFEFE] px-4 pb-8 pt-6">{children}</div>
      </div>
    </div>
  )
}
