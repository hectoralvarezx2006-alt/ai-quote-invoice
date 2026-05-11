'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { LayoutDashboard, FileText, Receipt, Users, Settings, LogOut, Sparkles, ChevronRight, BarChart2, ShoppingBag, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/types'

const nav = [
  { href: '/dashboard',            label: 'Inicio',        icon: LayoutDashboard },
  { href: '/dashboard/quotes',     label: 'Presupuestos',  icon: FileText },
  { href: '/dashboard/invoices',   label: 'Facturas',      icon: Receipt },
  { href: '/dashboard/clients',    label: 'Clientes',      icon: Users },
  { href: '/dashboard/products',   label: 'Catálogo',      icon: Package },
  { href: '/dashboard/expenses',   label: 'Gastos',        icon: ShoppingBag },
  { href: '/dashboard/accounting', label: 'Contabilidad',  icon: BarChart2 },
]

export default function Sidebar({ profile }: { profile: UserProfile | null }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex w-60 flex-col bg-surface-900 border-r border-surface-800 shrink-0">
      <div className="h-16 flex items-center px-5 border-b border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">AI Quote</p>
            <p className="text-surface-500 text-xs leading-tight">& Invoice</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active ? 'bg-brand-600 text-white shadow-brand' : 'text-surface-400 hover:text-white hover:bg-surface-800')}>
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-surface-500 group-hover:text-white')} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-200" />}
            </Link>
          )
        })}
        <div className="pt-4 mt-4 border-t border-surface-800">
          <Link href="/dashboard/settings"
            className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
              pathname === '/dashboard/settings' ? 'bg-brand-600 text-white' : 'text-surface-400 hover:text-white hover:bg-surface-800')}>
            <Settings className="w-4 h-4 shrink-0 text-surface-500 group-hover:text-white" />
            Configuración
          </Link>
        </div>
      </nav>
      <div className="p-3 border-t border-surface-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
            <span className="text-brand-400 font-bold text-xs uppercase">{(profile?.company_name ?? profile?.email ?? '?')[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{profile?.company_name ?? 'Mi empresa'}</p>
            <p className="text-surface-500 text-xs truncate">{profile?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}