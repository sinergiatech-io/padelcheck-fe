const NOTICE_KEY = 'padelcheck_login_notice'

export function rememberExpiredLoginNotice(): void {
  sessionStorage.setItem(NOTICE_KEY, 'expired')
}

export function consumeLoginNotice(): 'expired' | null {
  const notice = sessionStorage.getItem(NOTICE_KEY)
  sessionStorage.removeItem(NOTICE_KEY)
  return notice === 'expired' ? 'expired' : null
}
