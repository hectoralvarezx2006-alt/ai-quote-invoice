import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileText, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusLabel, getQuoteStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function QuotesPage() {
  const supabase = await createClient()

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Presupuestos</h2>
          <p className="text-surface-500 text-sm mt-0.5">{quotes?.length ?? 0} presupuestos en total</p>
        </div>
        <Link
          href="/dashboard/quotes/new"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-brand"
        >
          <Plus className="w-4 h-4" />
          Nuevo presupuesto
        </Link>
      </div>

      {quotes && quotes.length > 0 ? (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide hidden md:table-cell">Título</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide hidden lg:table-cell">Fecha</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(quote => (
                <tr key={quote.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors last:border-0 group">
                  <td className="px-5 py-4">
                    <span className="font-medium text-surface-900 text-sm">{quote.client_name}</span>
                    {quote.client_email && (
                      <p className="text-surface-400 text-xs mt-0.5">{quote.client_email}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-surface-600 text-sm hidden md:table-cell">
                    <span className="line-clamp-1">{quote.title}</span>
                  </td>
                  <td className="px-5 py-4 text-surface-400 text-sm hidden lg:table-cell">
                    {formatDate(quote.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', getQuoteStatusColor(quote.status))}>
                      {getQuoteStatusLabel(quote.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-surface-900 text-sm">
                    {formatCurrency(quote.total)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/quotes/${quote.id}`}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-brand-600 text-xs font-medium transition-all"
                    >
                      Ver <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 border-dashed p-16 text-center shadow-soft">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-brand-500" />
          </div>
          <p className="text-surface-700 font-semibold text-lg">No hay presupuestos</p>
          <p className="text-surface-400 text-sm mt-1 mb-6 max-w-xs mx-auto">
            Crea tu primer presupuesto con IA en menos de un minuto
          </p>
          <Link
            href="/dashboard/quotes/new"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-brand"
          >
            <Plus className="w-4 h-4" />
            Crear con IA
          </Link>
        </div>
      )}
    </div>
  )
}
