import { useEffect, useState, type ReactNode } from 'react'
import court from '@/assets/auth/court.svg?url'
import logo from '@/assets/auth/logo.png'
import info from '@/assets/auth/register-info.svg?url'
import success from '@/assets/auth/register-success.svg?url'
import error from '@/assets/auth/register-error.svg?url'
import warning from '@/assets/auth/register-warning.svg?url'
import '@/features/auth/pages/player-registration.css'

const tones = {
  info: 'border-[#C2D8FC] bg-[#EBF3FE]',
  success: 'border-[#BAEDCD] bg-[#E9F9EF]',
  error: 'border-[#FAC5C5] bg-[#FDECEC]',
  warning: 'border-[#FCE1B3] bg-[#FEF5E7]',
  neutral: 'border-[#E7E7E8] bg-[#F7F7F7]',
}
export type BannerTone = keyof typeof tones
const icons = { info, success, error, warning, neutral: error }

/** Status banner shared by the player and club registration wizards. */
const ClockIcon = ({ color }: { color: string }) => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M10 5.5V10l3 2" /></svg>

export function RegistrationBanner({ title, detail, tone = 'error', role = 'status', clock = false }: { title: string; detail?: string; tone?: BannerTone; role?: 'status' | 'alert'; clock?: boolean }) {
  return <div role={role} className={`flex items-center gap-3 rounded-[8px] border p-3 ${tones[tone]}`}>
    <div className="flex h-6 w-6 shrink-0 items-center justify-center">{clock ? <ClockIcon color={tone === 'info' ? '#605E64' : '#E8A317'} /> : <img src={icons[tone]} alt="" className={tone === 'neutral' ? 'opacity-60 grayscale' : undefined} />}</div>
    <div><p className="text-sm font-semibold leading-5">{title}</p>{detail && <p className="mt-0.5 text-xs leading-4 text-[#605E64]">{detail}</p>}</div>
  </div>
}

/** Dark court header + light rounded surface. Follows the visual viewport so the keyboard never hides the footer. */
/** `hero` is the larger header of the first step of the club wizard; it collapses like the others when the keyboard is open. */
export function RegistrationShell({ children, hero = false }: { children: ReactNode; hero?: boolean }) {
  const [viewport, setViewport] = useState(() => window.visualViewport?.height ?? window.innerHeight)
  const [keyboard, setKeyboard] = useState(false)
  useEffect(() => {
    const update = () => {
      setViewport(window.visualViewport?.height ?? window.innerHeight)
      setKeyboard(window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) > 100)
    }
    window.visualViewport?.addEventListener('resize', update)
    return () => window.visualViewport?.removeEventListener('resize', update)
  }, [])
  const big = hero && viewport >= 800
  return <div className="player-registration flex justify-center bg-[#120F18] text-[#120F18]">
    <div className="flex w-full max-w-[402px] flex-col overflow-hidden" style={{ height: viewport, paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="relative shrink-0 overflow-hidden" style={{ height: keyboard ? 72 : big ? 164 : 124 }}>
        <img src={court} alt="" className="absolute left-0 top-0 h-[172px] w-full" />
        <img src={logo} alt="Padel Check" className="absolute left-1/2 -translate-x-1/2 object-contain" style={{ top: keyboard ? 8 : big ? 32 : 16, height: keyboard ? 55 : big ? 122 : 91, width: keyboard ? 56 : big ? 123 : 92 }} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl bg-[#FEFEFE]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>{children}</div>
    </div>
  </div>
}

export const registrationFieldClass = 'h-14 w-full rounded-[8px] border border-[#929195] bg-[#FEFEFE] px-4 text-sm font-medium leading-5 text-[#120F18] shadow-none placeholder:text-[#605E64] focus-visible:ring-2 focus-visible:ring-[#C9CF38]'
