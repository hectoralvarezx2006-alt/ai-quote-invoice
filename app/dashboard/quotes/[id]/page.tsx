'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Receipt, Trash2,
  CheckCircle2, Send, Clock, XCircle, Loader2, Copy, ExternalLink
} from 'lucide-react'
import { formatCurrency, formatDate, getQuoteStatusLabel, getQuoteStatusColor } from '@/lib/utils'
import { getQuote, updateQuoteStatus, deleteQuote } from '@/services/quotes'
import { convertQuoteToInvoice } from '@/services/invoices'
import { generatePDF } from '@/services/pdf'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Quote, UserProfile } from '@/types'

const statusOptions = [
  { value: 'draft', label: 'Borrador', icon: Clock },
  { value: 'sent', label: 'Enviado', icon: Send },
  { value: 'accepted', label: 'Aceptado', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rechazado', icon: XCircle },
]

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [quote, setQuote] = useState<Quote | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sending, setSending] = useState(false)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  useEffect(() => {
    async function load() {
      try {
        const [q, supabase] = await Promise.all([
          getQuote(id),
          Promise.resolve(createClient()),
        ])
        setQuote(q)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: p } = await supabase.from('users').select('*').eq('id', user.id).single()
          setProfile(p)
        }
      } catch {
        toast.error('Error cargando presupuesto')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function handleStatusChange(status: Quote['status']) {
    if (!quote) return
    try {
      await updateQuoteStatus(id, status)
      setQuote(prev => prev ? { ...prev, status } : prev)
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al actualizar estado')
    }
  }

  async function handleConvertToInvoice() {
    if (!quote) return
    setConverting(true)
    try {
      const invoice = await convertQuoteToInvoice(quote)
      toast.success(`Factura ${invoice.invoice_number} creada`)
      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al convertir')
    } finally {
      setConverting(false)
    }
  }

  async function handleExportPDF() {
    if (!quote) return
    setExporting(true)
    try {
      await generatePDF({ document: quote, profile, type: 'quote' })
      toast.success('PDF descargado')
    } catch {
      toast.error('Error generando PDF')
    } finally {
      setExporting(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    try {
      await deleteQuote(id)
      toast.success('Presupuesto eliminado')
      router.push('/dashboard/quotes')
    } catch {
      toast.error('Error al eliminar')
      setDeleting(false)
    }
  }

  async function handleSendEmail() {
    if (!quote) return
    if (!quote.client_email) {
      toast.error('Este presupuesto no tiene email de cliente')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuote(prev => prev ? { ...prev, status: 'sent' } : prev)
      toast.success(`Email enviado a ${quote.client_email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  function handleCopyPortalLink() {
    if (!quote?.public_token) {
      toast.error('Guarda el presupuesto primero')
      return
    }
    const url = `${appUrl}/p/${quote.public_token}`
    navigator.clipboard.writeText(url)
    toast.success('Enlace copiado al portapapeles')
  }

  function handleOpenPortal() {
    if (!quote?.public_token) return
    window.open(`${appUrl}/p/${quote.public_token}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-16">
        <p className="text-surface-500">Presupuesto no encontrado</p>
        <Link href="/dashboard/quotes" className="text-brand-600 mt-2 block text-sm hover:underline">
          Volver a presupuestos
        </Link>
      </div>
    )
  }

  const portalUrl = quote.public_token ? `${appUrl}/p/${quote.public_token}` : null

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href="/dashboard/quotes" className="inline-flex items-center gap-1.5 text-surface-500 hover:text-surface-700 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Presupuestos
        </Link>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-200 bg-white text-surface-700 hover:bg-surface-50 text-sm font-medium transition-all"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            PDF
          </button>

          <button
            onClick={handleSendEmail}
            disabled={sending || !quote.client_email}
            title={!quote.client_email ? 'Añade email de cliente primero' : ''}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all shadow-brand disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar al cliente
          </button>

          <button
            onClick={handleConvertToInvoice}
            disabled={converting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all"
          >
            {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            Convertir a factura
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 text-sm transition-all"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-surface-100 p-6 shadow-soft">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-surface-900">{quote.title}</h2>
                <p className="text-surface-500 text-sm mt-1">Para: <span className="font-medium text-surface-700">{quote.client_name}</span></p>
                {quote.client_email && <p className="text-surface-400 text-xs">{quote.client_email}</p>}
              </div>
              <span className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold', getQuoteStatusColor(quote.status))}>
                {getQuoteStatusLabel(quote.status)}
              </span>
            </div>
            {quote.description && (
              <p className="text-surface-600 text-sm leading-relaxed bg-surface-50 rounded-xl p-4">{quote.description}</p>
            )}
            <p className="text-surface-400 text-xs mt-4">Creado el {formatDate(quote.created_at)}</p>
          </div>

          {/* Portal link */}
          {portalUrl && (
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-brand-900 text-sm font-medium">Portal del cliente</p>
                <p className="text-brand-500 text-xs truncate">{portalUrl}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleCopyPortalLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-brand-200 text-brand-700 text-xs font-medium hover:bg-brand-50 transition-all"
                >
                  <Copy className="w-3 h-3" /> Copiar
                </button>
                <button
                  onClick={handleOpenPortal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> Ver
                </button>
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
            <div className="px-5 py-4 border-b border-surface-100">
              <h3 className="font-semibold text-surface-900">Partidas</h3>
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
                {quote.items.map((item, i) => (
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
                  <span>{formatCurrency(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">IVA ({quote.tax_rate}%)</span>
                  <span>{formatCurrency(quote.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t border-surface-200">
                  <span>Total</span>
                  <span className="text-brand-600 text-lg">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Notas</p>
              <p className="text-surface-700 text-sm">{quote.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Estado */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft">
            <h3 className="font-semibold text-surface-900 text-sm mb-3">Cambiar estado</h3>
            <div className="space-y-2">
              {statusOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleStatusChange(value as Quote['status'])}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all',
                    quote.status === value
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'text-surface-600 hover:bg-surface-50 border border-transparent'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {quote.status === value && <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-brand-600 rounded-2xl p-5 text-white shadow-brand">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-3">Importe total</p>
            <p className="text-3xl font-bold mb-1">{formatCurrency(quote.total)}</p>
            <p className="text-blue-200 text-xs">{quote.items.length} partidas · IVA {quote.tax_rate}% incl.</p>
          </div>

          {/* Acciones */}
          <div className="space-y-2">
            <button
              onClick={handleSendEmail}
              disabled={sending || !quote.client_email}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar al cliente
            </button>
            <button
              onClick={handleConvertToInvoice}
              disabled={converting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
            >
              {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Convertir a factura
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-surface-200 bg-white text-surface-700 font-semibold text-sm hover:bg-surface-50 transition-all"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Descargar PDF
            </button>
            {portalUrl && (
              <button
                onClick={handleCopyPortalLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-brand-200 text-brand-600 text-sm hover:bg-brand-50 transition-all"
              >
                <Copy className="w-4 h-4" />
                Copiar enlace portal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
