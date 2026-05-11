'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  Sparkles, Loader2, Plus, Trash2, Save,
  ArrowLeft, Wand2, MessageSquare, ChevronRight,
  CheckCircle2, HelpCircle, Package, ChevronDown, X
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { createQuote } from '@/services/quotes'
import { getProducts } from '@/services/products'
import type { AIQuoteResponse, Product } from '@/types'
import { IRPF_RATES, TAX_RATES } from '@/types'
import Link from 'next/link'

interface EditableItem {
  name: string
  description: string
  quantity: number
  price: number
  tax_rate: number
}

interface AIQuestion {
  id: string
  question: string
  hint: string
  type: string
}

const clientTypes = ['Empresa grande','Startup / PYME','Autónomo / Freelance','Particular','ONG / Sin ánimo de lucro']

type Step = 'form' | 'questions' | 'edit'

export default function NewQuotePage() {
  const router = useRouter()
  const [step, setStep]         = useState<Step>('form')
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  const [jobDescription, setJobDescription]     = useState('')
  const [approximatePrice, setApproximatePrice] = useState('')
  const [clientType, setClientType]             = useState('Empresa grande')
  const [clientName, setClientName]             = useState('')
  const [clientEmail, setClientEmail]           = useState('')
  const [wantsQuestions, setWantsQuestions]     = useState(false)
  const [questions, setQuestions]               = useState<AIQuestion[]>([])
  const [answers, setAnswers]                   = useState<Record<string, string>>({})

  const [quoteTitle, setQuoteTitle]             = useState('')
  const [quoteDescription, setQuoteDescription] = useState('')
  const [quoteNotes, setQuoteNotes]             = useState('')
  const [items, setItems]                       = useState<EditableItem[]>([])
  const [applyIrpf, setApplyIrpf]               = useState(false)
  const [irpfRate, setIrpfRate]                 = useState(15)
  const [customIrpf, setCustomIrpf]             = useState(false)

  const subtotal   = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const taxAmount  = items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate / 100), 0)
  const irpfAmount = applyIrpf ? subtotal * (irpfRate / 100) : 0
  const total      = subtotal + taxAmount - irpfAmount
  const taxBreakdown = [0,4,10,21].map(rate => ({
    rate,
    base:  items.filter(i => i.tax_rate === rate).reduce((s,i) => s + i.price*i.quantity, 0),
    cuota: items.filter(i => i.tax_rate === rate).reduce((s,i) => s + i.price*i.quantity*(rate/100), 0),
  })).filter(t => t.base > 0)

  useEffect(() => { getProducts().then(setProducts).catch(() => {}) }, [])

  async function handleGetQuestions(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/refine-quote', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ jobDescription, clientType, approximatePrice }) })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setQuestions(data.questions ?? [])
      const init: Record<string,string> = {}
      data.questions?.forEach((q: AIQuestion) => { init[q.id] = '' })
      setAnswers(init); setStep('questions')
    } catch { toast.error('Error generando preguntas. Intenta sin preguntas.') }
    finally { setLoading(false) }
  }

  async function handleGenerateDirect(e: React.FormEvent) { e.preventDefault(); await generateQuote() }
  async function handleGenerateWithAnswers() { await generateQuote(answers) }

  async function generateQuote(answersMap?: Record<string, string>) {
    setLoading(true)
    try {
      let enriched = jobDescription
      if (answersMap && questions.length > 0) {
        const qa = questions.filter(q => answersMap[q.id]?.trim()).map(q => `- ${q.question}: ${answersMap[q.id]}`).join('\n')
        if (qa) enriched += `\n\nINFORMACIÓN ADICIONAL:\n${qa}`
      }
      const res = await fetch('/api/generate-quote', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ jobDescription: enriched, approximatePrice, clientType, clientName }) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Error') }
      const data: AIQuoteResponse = await res.json()
      setQuoteTitle(data.title); setQuoteDescription(data.description); setQuoteNotes(data.notes ?? '')
      setItems(data.items.map(i => ({ name: i.name, description: i.description, quantity: i.quantity ?? 1, price: i.price, tax_rate: 21 })))
      setStep('edit'); toast.success('¡Presupuesto generado!')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error de IA') }
    finally { setLoading(false) }
  }

  function addItem() { setItems(prev => [...prev, { name:'', description:'', quantity:1, price:0, tax_rate:21 }]) }
  function addFromCatalog(p: Product) {
    setItems(prev => [...prev, { name:p.name, description:p.description??'', quantity:1, price:p.price, tax_rate:p.tax_rate }])
    setShowCatalog(false); toast.success(`"${p.name}" añadido`)
  }
  function removeItem(idx: number) { setItems(prev => prev.filter((_,i) => i !== idx)) }
  function updateItem<K extends keyof EditableItem>(idx: number, field: K, value: EditableItem[K]) {
    setItems(prev => prev.map((item,i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSave() {
    if (!clientName.trim()) { toast.error('Introduce el nombre del cliente'); return }
    if (items.length === 0) { toast.error('Añade al menos un item'); return }
    setSaving(true)
    try {
      const quote = await createQuote(
        { client_name: clientName, client_email: clientEmail||null, client_id:null, title:quoteTitle,
          description:quoteDescription, subtotal, tax_rate:21, tax_amount:taxAmount, total,
          apply_irpf:applyIrpf, irpf_rate:irpfRate, irpf_amount:irpfAmount,
          status:'draft', notes:quoteNotes||null, valid_until:null },
        items.map(item => ({ name:item.name, description:item.description, quantity:item.quantity,
          price:item.price, tax_rate:item.tax_rate,
          tax_amount: item.price * item.quantity * (item.tax_rate/100),
          subtotal: item.price * item.quantity }))
      )
      toast.success('Presupuesto guardado')
      router.push(`/dashboard/quotes/${quote.id}`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error al guardar') }
    finally { setSaving(false) }
  }

  const inputClass = cn('w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-900 text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all')
  const visibleSteps = wantsQuestions ? ['form','questions','edit'] : ['form','edit']
  const currentIdx = visibleSteps.indexOf(step)
  const stepLabels: Record<string,string> = { form:'Descripción', questions:'Preguntas IA', edit:'Editor' }

  function StepIndicator() {
    return (
      <div className="flex items-center gap-2 mb-6">
        {visibleSteps.map((s,i) => {
          const isDone = i < currentIdx; const isCurrent = i === currentIdx
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                isCurrent ? 'bg-brand-600 text-white' : isDone ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-400')}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <span>{i+1}</span>}
                {stepLabels[s]}
              </div>
              {i < visibleSteps.length-1 && <ChevronRight className="w-3.5 h-3.5 text-surface-300" />}
            </div>
          )
        })}
      </div>
    )
  }

  // STEP 1
  if (step === 'form') return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <Link href="/dashboard/quotes" className="inline-flex items-center gap-1.5 text-surface-500 hover:text-surface-700 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>
      <StepIndicator />
      <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Wand2 className="w-5 h-5 text-white" /></div>
            <div><h2 className="text-white font-bold text-lg">Generar con IA</h2><p className="text-blue-100 text-sm">Describe tu proyecto</p></div>
          </div>
        </div>
        <form onSubmit={wantsQuestions ? handleGetQuestions : handleGenerateDirect} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700">¿Qué vas a hacer? *</label>
            <textarea required value={jobDescription} onChange={e => setJobDescription(e.target.value)} rows={4}
              placeholder="Ej: Diseño y desarrollo de una landing page..." className={cn(inputClass,'resize-none')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Tipo de cliente</label>
              <select value={clientType} onChange={e => setClientType(e.target.value)} className={inputClass}>
                {clientTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Precio aprox.</label>
              <input value={approximatePrice} onChange={e => setApproximatePrice(e.target.value)} placeholder="Ej: 1500€" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t border-surface-100 pt-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Nombre del cliente *</label>
              <input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Empresa o persona" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Email</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@email.com" className={inputClass} />
            </div>
          </div>
          <div onClick={() => setWantsQuestions(!wantsQuestions)}
            className={cn('flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none',
              wantsQuestions ? 'border-brand-300 bg-brand-50' : 'border-surface-100 bg-surface-50 hover:border-surface-200')}>
            <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5',
              wantsQuestions ? 'bg-brand-600 border-brand-600' : 'border-surface-300 bg-white')}>
              {wantsQuestions && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={cn('text-sm font-semibold', wantsQuestions ? 'text-brand-800' : 'text-surface-700')}>Quiero que la IA me haga preguntas primero</p>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', wantsQuestions ? 'bg-brand-100 text-brand-700' : 'bg-surface-200 text-surface-500')}>Recomendado</span>
              </div>
              <p className={cn('text-xs mt-1', wantsQuestions ? 'text-brand-600' : 'text-surface-400')}>La IA hará 3-5 preguntas para ajustar mejor el presupuesto</p>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all shadow-brand disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{wantsQuestions ? 'Analizando...' : 'Generando...'}</>
              : wantsQuestions ? <><MessageSquare className="w-4 h-4" />Siguiente: preguntas de la IA</>
              : <><Sparkles className="w-4 h-4" />Generar presupuesto con IA</>}
          </button>
        </form>
      </div>
    </div>
  )

  // STEP 2
  if (step === 'questions') return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <button onClick={() => setStep('form')} className="inline-flex items-center gap-1.5 text-surface-500 hover:text-surface-700 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
      <StepIndicator />
      <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-brand-600 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5 text-white" /></div>
            <div><h2 className="text-white font-bold text-lg">Preguntas de la IA</h2><p className="text-violet-100 text-sm">Responde lo que puedas</p></div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-surface-50 rounded-xl p-4 border border-surface-100">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide mb-1">Tu descripción</p>
            <p className="text-surface-700 text-sm line-clamp-3">{jobDescription}</p>
          </div>
          <div className="space-y-4">
            {questions.map((q,i) => (
              <div key={q.id} className="space-y-1.5">
                <label className="flex items-start gap-2 text-sm font-medium text-surface-800">
                  <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                  {q.question}
                </label>
                <input value={answers[q.id]??''} onChange={e => setAnswers(prev => ({...prev,[q.id]:e.target.value}))}
                  placeholder={q.hint||'Tu respuesta...'} className={cn(inputClass,'pl-7')} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => generateQuote()} disabled={loading}
              className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-xl border border-surface-200 text-surface-600 text-sm font-medium hover:bg-surface-50 transition-all disabled:opacity-50">
              Saltar y generar
            </button>
            <button onClick={handleGenerateWithAnswers} disabled={loading}
              className="flex-[2] flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-all shadow-brand disabled:opacity-60">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generando...</> : <><Sparkles className="w-4 h-4" />Generar presupuesto</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // STEP 3: EDITOR
  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setStep(wantsQuestions ? 'questions' : 'form')}
          className="inline-flex items-center gap-1.5 text-surface-500 hover:text-surface-700 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-brand disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar presupuesto
        </button>
      </div>
      <StepIndicator />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 space-y-4 shadow-soft">
            <h3 className="font-semibold text-surface-400 text-xs uppercase tracking-wide">Información</h3>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Título</label>
              <input value={quoteTitle} onChange={e => setQuoteTitle(e.target.value)} className={inputClass} placeholder="Título" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Descripción</label>
              <textarea value={quoteDescription} onChange={e => setQuoteDescription(e.target.value)} rows={2} className={cn(inputClass,'resize-none')} />
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-400 text-xs uppercase tracking-wide">Partidas</h3>
              <div className="flex items-center gap-2">
                {products.length > 0 && (
                  <div className="relative">
                    <button onClick={() => setShowCatalog(!showCatalog)}
                      className="flex items-center gap-1.5 text-xs text-surface-500 font-medium hover:text-brand-600 border border-surface-200 px-2.5 py-1.5 rounded-lg transition-all">
                      <Package className="w-3.5 h-3.5" /> Catálogo <ChevronDown className={cn('w-3 h-3 transition-transform', showCatalog && 'rotate-180')} />
                    </button>
                    {showCatalog && (
                      <div className="absolute right-0 top-9 z-50 w-72 bg-white border border-surface-200 rounded-2xl shadow-modal overflow-hidden">
                        <div className="px-3 py-2 border-b border-surface-100 flex items-center justify-between">
                          <p className="text-xs font-semibold text-surface-500 uppercase">Del catálogo</p>
                          <button onClick={() => setShowCatalog(false)}><X className="w-3.5 h-3.5 text-surface-400" /></button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {products.map(p => (
                            <button key={p.id} onClick={() => addFromCatalog(p)}
                              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-50 transition-colors text-left">
                              <div>
                                <p className="text-sm font-medium text-surface-900">{p.name}</p>
                                <p className="text-xs text-surface-400">IVA {p.tax_rate}% · por {p.unit}</p>
                              </div>
                              <p className="text-sm font-bold text-brand-600">{formatCurrency(p.price)}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors">
                  <Plus className="w-4 h-4" /> Añadir
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {items.map((item,idx) => (
                <div key={idx} className="border border-surface-100 rounded-xl p-4 space-y-3 hover:border-surface-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <input value={item.name} onChange={e => updateItem(idx,'name',e.target.value)} placeholder="Nombre" className={cn(inputClass,'font-medium')} />
                      <input value={item.description} onChange={e => updateItem(idx,'description',e.target.value)} placeholder="Descripción" className={cn(inputClass,'text-xs')} />
                    </div>
                    <button onClick={() => removeItem(idx)} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-400 hover:bg-red-50 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400">Cantidad</label>
                      <input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx,'quantity',parseFloat(e.target.value)||1)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400">Precio (€)</label>
                      <input type="number" min={0} step={0.01} value={item.price} onChange={e => updateItem(idx,'price',parseFloat(e.target.value)||0)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400">IVA</label>
                      <select value={item.tax_rate} onChange={e => updateItem(idx,'tax_rate',parseInt(e.target.value))} className={inputClass}>
                        <option value={0}>0%</option>
                        <option value={4}>4%</option>
                        <option value={10}>10%</option>
                        <option value={21}>21%</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-surface-400">Subtotal</label>
                      <div className="px-3.5 py-2.5 rounded-xl bg-surface-50 border border-surface-100 text-sm font-medium text-surface-700">{formatCurrency(item.price*item.quantity)}</div>
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && <div className="text-center py-8 text-surface-400 text-sm">Añade items o selecciona del catálogo</div>}
            </div>
          </div>

          {/* Notas */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Notas</label>
              <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)} rows={2} className={cn(inputClass,'resize-none')} placeholder="Condiciones, plazos..." />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft space-y-3">
            <h3 className="font-semibold text-surface-400 text-xs uppercase tracking-wide">Cliente</h3>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputClass} placeholder="Nombre *" />
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className={inputClass} placeholder="Email" />
          </div>

          {/* Fiscalidad */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft space-y-3">
            <h3 className="font-semibold text-surface-400 text-xs uppercase tracking-wide">Fiscalidad</h3>
            <div onClick={() => setApplyIrpf(!applyIrpf)}
              className={cn('flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                applyIrpf ? 'border-amber-200 bg-amber-50' : 'border-surface-100 hover:border-surface-200')}>
              <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                applyIrpf ? 'bg-amber-500 border-amber-500' : 'border-surface-300 bg-white')}>
                {applyIrpf && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div>
                <p className={cn('text-sm font-medium', applyIrpf ? 'text-amber-800' : 'text-surface-700')}>Retención IRPF</p>
                <p className="text-xs text-surface-400">Para facturas a empresas</p>
              </div>
            </div>
            {applyIrpf && (
              <div className="space-y-2 animate-slide-up">
                {!customIrpf ? (
                  <select value={irpfRate} onChange={e => setIrpfRate(parseInt(e.target.value))} className={inputClass}>
                    {IRPF_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input type="number" min={0} max={50} step={0.1} value={irpfRate}
                      onChange={e => setIrpfRate(parseFloat(e.target.value)||0)} className={inputClass} />
                    <span className="text-surface-500 text-sm font-medium">%</span>
                  </div>
                )}
                <button onClick={() => setCustomIrpf(!customIrpf)} className="text-xs text-brand-600 hover:underline">
                  {customIrpf ? 'Usar tipos predefinidos' : 'Tipo personalizado'}
                </button>
              </div>
            )}
          </div>

          {/* Totales */}
          <div className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft space-y-2.5">
            <h3 className="font-semibold text-surface-400 text-xs uppercase tracking-wide mb-3">Resumen</h3>
            <div className="flex justify-between text-sm"><span className="text-surface-500">Base imponible</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            {taxBreakdown.map(t => (
              <div key={t.rate} className="flex justify-between text-sm"><span className="text-surface-500">IVA {t.rate}%</span><span className="font-medium">{formatCurrency(t.cuota)}</span></div>
            ))}
            {applyIrpf && (
              <div className="flex justify-between text-sm"><span className="text-amber-600">IRPF -{irpfRate}%</span><span className="font-medium text-amber-600">-{formatCurrency(irpfAmount)}</span></div>
            )}
            <div className="border-t border-surface-100 pt-2.5 flex justify-between">
              <span className="font-bold text-surface-900">Total</span>
              <span className="font-bold text-brand-600 text-lg">{formatCurrency(total)}</span>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-all shadow-brand disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar presupuesto
          </button>
        </div>
      </div>
    </div>
  )
}