import { readGoogleClubDraft } from '@/features/club-onboarding/google-club-draft'
import { Link } from 'react-router-dom'

export function CheckoutReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f8f8] px-4 py-10 text-[#120f18]">
      <section className="w-full max-w-sm space-y-5 rounded-xl bg-white p-6">
        <h1 className="text-2xl font-semibold">Volvé a PadelCheck</h1>
        <p className="text-sm text-[#605e64]">Consultá el estado de tu pago en Plan del club.</p>
        <a className="block rounded-xl bg-[#c9cf38] px-4 py-3 text-center font-medium" href="padelcheck://billing/return">
          Abrir PadelCheck
        </a>
        <Link className="block px-4 py-2 text-center text-sm font-medium underline" to={readGoogleClubDraft() ? "/register/club" : "/club/plan"}>
          Continuar en el navegador
        </Link>
      </section>
    </main>
  )
}
