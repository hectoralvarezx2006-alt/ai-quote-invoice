import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Receipt, ArrowRight } from 'lucide-react'
import { formatCurrency, formatDateShort, getInvoiceStatusLabel, getInvoiceStatusColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Facturas</h2>
          <p className="text-surface-500 text-sm mt-0.5">{invoices?.length ?? 0} facturas en total</p>
        </div>
      </div>

      {invoices && invoices.length > 0 ? (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Nº Factura</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide hidden md:table-cell">Cliente</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide hidden lg:table-cell">Emisión</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide hidden lg:table-cell">Vencimiento</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-surface-50 hover:bg-surface-50 transition-colors last:border-0 group">
                  <td className="px-5 py-4">
                    <span className="font-mono font-semibold text-surface-900 text-sm">{inv.invoice_number}</span>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-medium text-surface-700 text-sm">{inv.client_name}</span>
                  </td>
                  <td className="px-5 py-4 text-surface-400 text-sm hidden lg:table-cell">
                    {formatDateShort(inv.issue_date)}
                  </td>
                  <td className="px-5 py-4 text-surface-400 text-sm hidden lg:table-cell">
                    {formatDateShort(inv.due_date)}
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', getInvoiceStatusColor(inv.status))}>
                      {getInvoiceStatusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-surface-900 text-sm">
                    {formatCurrency(inv.total)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
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
          <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-7 h-7 text-violet-500" />
          </div>
          <p className="text-surface-700 font-semibold text-lg">No hay facturas</p>
          <p className="text-surface-400 text-sm mt-1 mb-6 max-w-xs mx-auto">
            Convierte un presupuesto aceptado en factura con un solo clic
          </p>
          <Link
            href="/dashboard/quotes"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-brand"
          >
            Ver presupuestos
          </Link>
        </div>
      )}
    </div>
  )
}
