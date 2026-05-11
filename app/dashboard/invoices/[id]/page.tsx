'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Loader2, CheckCircle,
  Clock, XCircle, AlertCircle
} from 'lucide-react'
import { formatCurrency, formatDateShort, getInvoiceStatusLabel, getInvoiceStatusColor } from '@/lib/utils'
import { getInvoice, updateInvoiceStatus } from '@/services/invoices'
import { generatePDF } from '@/services/pdf'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Invoice, UserProfile } from '@/types'

const statusOptions = [
  { value: 'pending', label: 'Pendiente', icon: Clock },
  { value: 'paid', label: 'Pagada', icon: CheckCircle },
  { value: 'overdue', label: 'Vencida', icon: AlertCircle },
  { value: 'cancelled', label: 'Cancelada', icon: XCircle },
]

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [inv, supabase] = await Promise.all([getInvoice(id), Promise.resolve(createClient())])
        setInvoice(inv)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
          setProfile(p)
        }
      } catch {
        toast.error('Error cargando factura')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleStatusChange(status: Invoice['status']) {
    if (!invoice) return
    try {
      await updateInvoiceStatus(id, status)
      setInvoice(prev => prev ? { ...prev, status } : prev)
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  async function handleExportPDF() {
    if (!invoice) return
    setExporting(true)
    try {
      await generatePDF({ document: invoice, profile, type: 'invoice' })
      toast.success('PDF descargado')
    } catch (err) {
      toast.error('Error generando PDF')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Factura no encontrada</p>
        <Link href="/dashboard/invoices" className="text-brand-600 mt-2 block text-sm hover:underline">
          Volver a facturas
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-1.5 text-surface-500 hover:text-surface-700 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Facturas
        </Link>

        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-200 bg-white text-surface-700 hover:bg-surface-50 text-sm font-medium transition-all"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar PDF
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-surface-100 p-6 shadow-soft">
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded">
                    {invoice.invoice_number}
                  </span>
                  <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium', getInvoiceStatusColor(invoice.status))}>
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-surface-900">{invoice.title}</h2>
                <p className="text-surface-500 text-sm mt-1">
                  Para: <span className="font-medium text-surface-700">{invoice.client_name}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-surface-50 rounded-xl p-4 mb-4">
              <div>
                <p className="text-xs text-surface-400 mb-1">Fecha de emisión</p>
                <p className="font-medium text-surface-900 text-sm">{formatDateShort(invoice.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs text-surface-400 mb-1">Fecha de vencimiento</p>
                <p className="font-medium text-surface-900 text-sm">{formatDateShort(invoice.due_date)}</p>
              </div>
            </div>

            {invoice.description && (
              <p className="text-surface-600 text-sm leading-relaxed">{invoice.description}</p>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
            <div className="px-5 py-4 border-b border-surface-100">
              <h3 className="font-semibold text-surface-900">Conceptos</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-50 bg-surface-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 uppercase">Concepto</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-surface-400 uppercase hidden sm:table-cell">Cant.</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase">Precio</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-surface-400 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={item.id ?? i} className="border-b border-surface-50 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-medium text-surface-900 text-sm">{item.name}</p>
                      {item.description && <p className="text-surface-400 text-xs mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-5 py-4 text-center text-surface-600 text-sm hidden sm:table-cell">{item.quantity}</td>
                    <td className="px-5 py-4 text-right text-surface-600 text-sm">{formatCurrency(item.price)}</td>
                    <td className="px-5 py-4 text-right font-semibold text-surface-900 text-sm">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 border-t border-surface-100 bg-surface-50">
              <div className="max-w-xs ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">Base imponible</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">IVA ({invoice.tax_rate}%)</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-surface-200">
                  <span>Total</span>
                  <span className="text-brand-600 text-lg">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-brand-600 rounded-2xl p-5 text-white shadow-brand">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-2">{invoice.invoice_number}</p>
            <p className="text-3xl font-bold mb-1">{formatCurrency(invoice.total)}</p>
            <p className="text-blue-200 text-xs">IVA {invoice.tax_rate}% incluido</p>
          </div>

          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft">
            <h3 className="font-semibold text-surface-900 text-sm mb-3">Cambiar estado</h3>
            <div className="space-y-2">
              {statusOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value as Invoice['status'])}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                    invoice.status === value
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-surface-600 hover:bg-surface-50 border border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {invoice.status === value && <CheckCircle className="w-3.5 h-3.5 text-brand-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-700 font-semibold text-sm hover:bg-surface-50 transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar PDF
          </button>

          {invoice.quote_id && (
            <Link
              href={`/dashboard/quotes/${invoice.quote_id}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-surface-200 text-surface-500 text-sm hover:bg-surface-50 transition-all"
            >
              Ver presupuesto original
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
