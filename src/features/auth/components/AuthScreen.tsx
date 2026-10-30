import type { ReactNode } from 'react'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'

export function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen justify-center bg-[#120F18]">
      <div className="flex min-h-screen w-full max-w-[402px] flex-col">
        <div className="relative flex h-[148px] items-center justify-center overflow-hidden">
          <img src={court} alt="" className="absolute left-0 top-0 h-[172px] w-full" />
          <img src={logo} alt="Padel Check" className="relative h-[90.695px] w-[92px] object-contain" />
        </div>
        <div className="flex flex-1 flex-col rounded-t-3xl bg-[#FEFEFE] px-4 pb-[58px] pt-6">{children}</div>
      </div>
    </div>
  )
}
