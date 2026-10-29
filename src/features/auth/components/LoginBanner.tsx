import blockedIcon from '@/assets/auth/alert-blocked.svg?url'
import errorIcon from '@/assets/auth/alert-error.svg?url'
import warningIcon from '@/assets/auth/alert-warning.svg?url'
import type { LoginNotice } from '@/features/auth/auth-copy'

const tones = {
  error: { box: 'border-[#FAC5C5] bg-[#FDECEC]', icon: errorIcon },
  warning: { box: 'border-[#FCE1B3] bg-[#FEF5E7]', icon: warningIcon },
  neutral: { box: 'border-[#E7E7E8] bg-[#F8F8F8]', icon: blockedIcon },
} as const

export function LoginBanner({ tone, title, detail }: LoginNotice) {
  const style = tones[tone]
  return (
    <div role="alert" className={`flex items-center gap-3 rounded-lg border p-3 ${style.box}`}>
      <span className="relative h-6 w-6 shrink-0">
        <img src={style.icon} alt="" width={20} height={20} className="absolute left-0.5 top-0.5 h-5 w-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-semibold leading-5 text-[#120F18]">{title}</p>
        {detail ? <p className="text-xs font-normal leading-4 text-[#605E64]">{detail}</p> : null}
      </div>
    </div>
  )
}
