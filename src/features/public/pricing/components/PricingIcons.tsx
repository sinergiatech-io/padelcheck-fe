import type { LimitKey } from '../pricing-model'

type IconProps = { size?: number; color?: string }

/* Material-style outline icons matching the KAN-140 frames (semantic icons linked in the UI KIT). */
const PATHS: Record<LimitKey, string> = {
  MAX_ACTIVE_TOURNAMENTS: 'M7 4h10v3a5 5 0 0 1-10 0V4Zm0 1H4.5v1.5A3 3 0 0 0 7 9.45M17 5h2.5v1.5A3 3 0 0 1 17 9.45M12 12v4m-3.5 4h7M10 16h4v4h-4z',
  MAX_ENTRIES_PER_EVENT: 'M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11Zm-6 8.5v-.75A4.75 4.75 0 0 1 7.75 14h2.5A4.75 4.75 0 0 1 15 18.75v.75M15.5 4.6a3.25 3.25 0 0 1 0 6.3M17.5 14.2a4.75 4.75 0 0 1 3.5 4.55v.75',
  MAX_DIVISIONS_PER_EVENT: 'M5 5h5v4H5zM5 15h5v4H5zM10 7h3.5v10H10M13.5 12H19m-2.5-2.5L19 12l-2.5 2.5',
  MAX_STAFF_USERS: 'M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5ZM5 20v-.75A5.25 5.25 0 0 1 10.25 14h3.5A5.25 5.25 0 0 1 19 19.25V20',
}

export function LimitIcon({ limit, size = 20, color = '#C9CF38' }: IconProps & { limit: LimitKey }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[limit]} />
    </svg>
  )
}

export function CheckIcon({ size = 18, color = '#FAFAEB' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

export function CrossIcon({ size = 18, color = '#B6B5B7' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="m4.5 4.5 7 7m0-7-7 7" />
    </svg>
  )
}

export function MissingIcon({ size = 16, color = '#B6B5B7' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 8h8" />
    </svg>
  )
}

export function MenuIcon({ size = 24, color = '#FAFAEB' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function CloseIcon({ size = 24, color = '#FAFAEB' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}
