'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Plus, Bell } from 'lucide-react'
import type { UserProfile } from '@/types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/dashboard/quotes': 'Presupuestos',
  '/dashboard/quotes/new': 'Nuevo presupuesto',
  '/dashboard/invoices': 'Facturas',
  '/dashboard/clients': 'Clientes',
  '/dashboard/settings': 'Configuración',
}

export default function TopBar({ profile }: { profile: UserProfile | null }) {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? 'Dashboard'
  const isEdit = pathname.includes('/edit') || (pathname.split('/').length > 3 && !pathname.endsWith('/new'))

  return (
    <header className="h-16 border-b border-surface-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 sticky top-0 z-10">
      <div>
        <h1 className="font-semibold text-surface-900 text-base">
          {isEdit ? 'Editar presupuesto' : title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {pathname === '/dashboard/quotes' && (
          <Link
            href="/dashboard/quotes/new"
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-all shadow-brand"
          >
            <Plus className="w-4 h-4" />
            Nuevo presupuesto
          </Link>
        )}

        <button className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-all">
          <Bell className="w-4 h-4 text-surface-500" />
        </button>

        <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center">
          <span className="text-brand-600 font-bold text-xs uppercase">
            {(profile?.company_name ?? profile?.email ?? '?')[0]}
          </span>
        </div>
      </div>
    </header>
  )
}
