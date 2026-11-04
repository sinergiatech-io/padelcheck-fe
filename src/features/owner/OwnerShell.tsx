import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function OwnerShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f6f6f4] text-dark-900">
      <header className="border-b border-divider bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-dark-700">Dueño</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <nav className="flex gap-4 text-sm font-medium">
            <Link to="/owner" className="underline-offset-4 hover:underline">Clubes</Link>
            <Link to="/owner/catalog" className="underline-offset-4 hover:underline">Catálogo</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}

export function OwnerNotice({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p role={error ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${error ? 'border-[#fac5c5] bg-[#fdecec]' : 'border-[#baedcd] bg-[#e9f9ef]'}`}>
      {message}
    </p>
  )
}
