'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, Download, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Quote, UserProfile } from '@/types'

type PageState = 'loading' | 'ready' | 'accepted' | 'rejected' | 'already_responded' | 'error'

export default function PublicQuotePage() {
  const params = useParams()
  const token = params.token as string

  const [state, setState] = useState<PageState>('loading')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [responding, setResponding] = useState<'accepted' | 'rejected' | null>(null)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public-quote?token=${token}`)
        if (!res.ok) throw new Error('No encontrado')
        const data = await res.json()
        setQuote(data.quote)
        setProfile(data.profile)

        if (data.quote.status === 'accepted') setState('already_responded')
        else if (data.quote.status === 'rejected') setState('already_responded')
        else setState('ready')
      } catch {
        setState('error')
      }
    }
    load()
  }, [token])

  async function handleRespond(response: 'accepted' | 'rejected') {
    setResponding(response)
    try {
      const res = await fetch('/api/quote-respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, response }),
      })
      if (!res.ok) throw new Error()
      setState(response)
      setQuote(prev => prev ? { ...prev, status: response } : prev)
    } catch {
      alert('Error al procesar tu respuesta. Inténtalo de nuevo.')
    } finally {
      setResponding(null)
    }
  }

  async function handleDownloadPDF() {
    if (!quote) return
    setGeneratingPDF(true)
    try {
      const { generatePDF } = await import('@/services/pdf')
      await generatePDF({ document: quote, profile, type: 'quote' })
    } catch (err) {
      alert('Error generando PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const brandColor = (profile as any)?.brand_color ?? '#3b6ef6'
  const companyName = profile?.company_name ?? 'Tu proveedor'

  // ── ESTADOS ──────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: brandColor }} />
          <p className="text-surface-500 text-sm">Cargando presupuesto...</p>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-surface-900 mb-2">Presupuesto no encontrado</h1>
          <p className="text-surface-500 text-sm">El enlace puede haber expirado o ser incorrecto.</p>
        </div>
      </div>
    )
  }

  if (state === 'accepted') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-slide-up">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">¡Presupuesto aceptado!</h1>
          <p className="text-surface-500 text-sm leading-relaxed">
            Hemos notificado a <strong>{companyName}</strong> de tu respuesta. Pronto se pondrán en contacto contigo.
          </p>
        </div>
      </div>
    )
  }

  if (state === 'rejected') {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm animate-slide-up">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Presupuesto rechazado</h1>
          <p className="text-surface-500 text-sm leading-relaxed">
            Hemos notificado a <strong>{companyName}</strong> de tu decisión.
          </p>
        </div>
      </div>
    )
  }

  if (!quote) return null

  const alreadyResponded = state === 'already_responded'

  // ── PORTAL PRINCIPAL ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header con color de marca */}
      <div className="h-2 w-full" style={{ backgroundColor: brandColor }} />

      <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">

        {/* Cabecera empresa */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-surface-400 uppercase tracking-wide mb-1">Presupuesto de</p>
            <h2 className="font-bold text-surface-900 text-lg">{companyName}</h2>
            {profile?.email && <p className="text-surface-400 text-sm">{profile.email}</p>}
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 bg-white text-surface-700 text-sm font-medium hover:bg-surface-50 transition-all"
          >
            {generatingPDF
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />
            }
            Descargar PDF
          </button>
        </div>

        {/* Tarjeta principal */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden mb-5">

          {/* Banner color */}
          <div className="px-6 py-5" style={{ backgroundColor: brandColor }}>
            <p className="text-white/70 text-xs uppercase tracking-wide mb-1">Presupuesto</p>
            <h1 className="text-white font-bold text-xl">{quote.title}</h1>
            {quote.description && (
              <p className="text-white/80 text-sm mt-1 leading-relaxed">{quote.description}</p>
            )}
          </div>

          {/* Info cliente + fechas */}
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50 flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-surface-400 mb-0.5">Para</p>
              <p className="font-semibold text-surface-900 text-sm">{quote.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-surface-400 mb-0.5">Fecha</p>
              <p className="font-semibold text-surface-900 text-sm">{formatDate(quote.created_at)}</p>
            </div>
            {quote.valid_until && (
              <div>
                <p className="text-xs text-surface-400 mb-0.5">Válido hasta</p>
                <p className="font-semibold text-surface-900 text-sm">{formatDateShort(quote.valid_until)}</p>
              </div>
            )}
            {alreadyResponded && (
              <div className="ml-auto">
                <span className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold',
                  quote.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}>
                  {quote.status === 'accepted' ? '✅ Aceptado' : '❌ Rechazado'}
                </span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase">Concepto</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase hidden sm:table-cell">Descripción</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-surface-400 uppercase">Cant.</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-surface-400 uppercase">Precio</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-surface-400 uppercase">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => (
                  <tr key={item.id ?? i} className="border-b border-surface-50 last:border-0">
                    <td className="px-6 py-4 font-medium text-surface-900 text-sm">{item.name}</td>
                    <td className="px-6 py-4 text-surface-400 text-sm hidden sm:table-cell">{item.description}</td>
                    <td className="px-4 py-4 text-center text-surface-600 text-sm">{item.quantity}</td>
                    <td className="px-6 py-4 text-right text-surface-600 text-sm">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-surface-900 text-sm">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="px-6 py-5 border-t border-surface-100 bg-surface-50">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Base imponible</span>
                <span className="text-surface-900">{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">IVA ({quote.tax_rate}%)</span>
                <span className="text-surface-900">{formatCurrency(quote.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-surface-200 text-lg">
                <span className="text-surface-900">Total</span>
                <span style={{ color: brandColor }}>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notas */}
        {quote.notes && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Notas</p>
            <p className="text-surface-700 text-sm leading-relaxed">{quote.notes}</p>
          </div>
        )}

        {/* Botones de respuesta */}
        {!alreadyResponded && (
          <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-6">
            <h3 className="font-bold text-surface-900 text-center mb-2">¿Qué te parece este presupuesto?</h3>
            <p className="text-surface-500 text-sm text-center mb-6">
              Tu respuesta llegará directamente a <strong>{companyName}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRespond('rejected')}
                disabled={responding !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all disabled:opacity-50"
              >
                {responding === 'rejected'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />
                }
                Rechazar
              </button>
              <button
                onClick={() => handleRespond('accepted')}
                disabled={responding !== null}
                className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all disabled:opacity-50 shadow-lg"
                style={{ backgroundColor: brandColor }}
              >
                {responding === 'accepted'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                Aceptar presupuesto
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-1.5 text-surface-400 text-xs">
            <Sparkles className="w-3 h-3" />
            Generado con AI Quote & Invoice
          </div>
        </div>
      </div>
    </div>
  )
}
