const key = 'padelcheck.google-club-draft'

export interface GoogleClubDraft { sessionId: string; token: string; expiresAt: number }

export function rememberGoogleClubDraft(sessionId: string, token: string, duration: number): boolean {
  try {
    sessionStorage.setItem(key, JSON.stringify({ sessionId, token, expiresAt: Date.now() + duration * 1000 }))
    return true
  } catch { return false }
}

export function readGoogleClubDraft(): GoogleClubDraft | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null") as Partial<GoogleClubDraft> | null
    if (typeof value?.sessionId === "string" && typeof value.token === "string"
      && typeof value.expiresAt === "number" && Date.now() < value.expiresAt) return value as GoogleClubDraft
    sessionStorage.removeItem(key)
  } catch { /* Browser storage can be unavailable. */ }
  return undefined
}

export function clearGoogleClubDraft() {
  try { sessionStorage.removeItem(key) } catch { /* Browser storage can be unavailable. */ }
}
