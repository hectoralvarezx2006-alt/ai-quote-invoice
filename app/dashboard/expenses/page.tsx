'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Loader2, Receipt, Search,
  Upload, Camera, Sparkles, AlertCircle,
  CheckCircle2, X, FileImage
} from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { EXPENSE_CATEGORIES } from '@/services/accounting'
import { cn } from '@/lib/utils'

interface Expense {
  id: string
  date: string
  description: string
  category: string
  amount: number
  tax_rate: number
  tax_amount: number
  total: number
  provider: string | null
  invoice_ref: string | null
  notes: string | null
}

const TAX_RATES = [0, 4, 10, 21]

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  description: '', category: 'otros', amount: '',
  tax_rate: '21', provider: '', invoice_ref: '', notes: '',
}

type FormMode = 'none' | 'manual' | 'scan'

export default function ExpensesPage() {
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [loading, setLoading]       = useState(true)
  const [formMode, setFormMode]     = useState<FormMode>('none')
  const [saving, setSaving]         = useState(false)
  const [scanning, setScanning]     = useState(false)
  const [search, setSearch]         = useState('')
  const [filterCat, setFilterCat]   = useState('all')
  const [form, setForm]             = useState(emptyForm)
  const [scannedFile, setScannedFile] = useState<File | null>(null)
  const [scannedPreview, setScannedPreview] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-xl border border-surface-200',
    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
  )

  async function loadExpenses() {
    const supabase = createClient()
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    setExpenses(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadExpenses() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const amount    = parseFloat(form.amount) || 0
  const taxRate   = parseFloat(form.tax_rate) || 0
  const taxAmount = amount * (taxRate / 100)
  const total     = amount + taxAmount

  // ── ESCÁNER ──────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScannedFile(file)

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setScannedPreview(url)
    } else {
      setScannedPreview(null)
    }
  }

  async function handleScan() {
    if (!scannedFile) return
    setScanning(true)
    setConfidence(null)

    try {
      const fd = new FormData()
      fd.append('file', scannedFile)

      const res = await fetch('/api/scan-ticket', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error escaneando')
      }

      const data = await res.json()

      // Rellenar el formulario con los datos extraídos
      setForm({
        date:        data.date || new Date().toISOString().split('T')[0],
        description: data.description || '',
        category:    data.category || 'otros',
        amount:      data.amount ? String(data.amount) : '',
        tax_rate:    String(data.tax_rate ?? 21),
        provider:    data.provider || '',
        invoice_ref: data.invoice_ref || '',
        notes:       '',
      })

      setConfidence(data.confidence)
      toast.success('¡Ticket analizado! Revisa los datos antes de guardar.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al escanear')
    } finally {
      setScanning(false)
    }
  }

  function clearScan() {
    setScannedFile(null)
    setScannedPreview(null)
    setConfidence(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function openForm(mode: FormMode) {
    setFormMode(mode)
    setForm(emptyForm)
    clearScan()
  }

  function closeForm() {
    setFormMode('none')
    setForm(emptyForm)
    clearScan()
  }

  // ── GUARDAR ──────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase.from('expenses').insert({
        user_id:     user.id,
        date:        form.date,
        description: form.description,
        category:    form.category,
        amount,
        tax_rate:    taxRate,
        tax_amount:  taxAmount,
        total,
        provider:    form.provider || null,
        invoice_ref: form.invoice_ref || null,
        notes:       form.notes || null,
      })
      if (error) throw error

      toast.success('Gasto guardado')
      closeForm()
      loadExpenses()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este gasto?')) return
    const supabase = createClient()
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    toast.success('Gasto eliminado')
  }

  const filtered = expenses.filter(e => {
    const matchSearch = search === '' ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.provider ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || e.category === filterCat
    return matchSearch && matchCat
  })

  const totalGastos       = filtered.reduce((s, e) => s + e.total, 0)
  const totalIvaSoportado = filtered.reduce((s, e) => s + e.tax_amount, 0)
  const catLabel = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c.label]))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Gastos deducibles</h2>
          <p className="text-surface-500 text-sm mt-0.5">Registra tus gastos para calcular el IVA soportado</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openForm('scan')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Camera className="w-4 h-4" />
            Escanear ticket
          </button>
          <button
            onClick={() => openForm('manual')}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-brand"
          >
            <Plus className="w-4 h-4" />
            Añadir manual
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-surface-100 p-4 shadow-soft">
          <p className="text-xs text-surface-400 mb-1">Total gastos</p>
          <p className="text-xl font-bold text-surface-900">{formatCurrency(totalGastos)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-surface-100 p-4 shadow-soft">
          <p className="text-xs text-surface-400 mb-1">IVA soportado</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalIvaSoportado)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-surface-100 p-4 shadow-soft">
          <p className="text-xs text-surface-400 mb-1">Nº de gastos</p>
          <p className="text-xl font-bold text-surface-900">{filtered.length}</p>
        </div>
      </div>

      {/* ── MODO ESCÁNER ── */}
      {formMode === 'scan' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-brand-600 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Escanear ticket con IA</h3>
                <p className="text-violet-100 text-xs">Sube una foto o PDF y la IA extrae los datos automáticamente</p>
              </div>
            </div>
            <button onClick={closeForm} className="text-white/70 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Zona de subida */}
            {!scannedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-surface-200 rounded-2xl p-10 text-center cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
              >
                <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-7 h-7 text-violet-500" />
                </div>
                <p className="font-semibold text-surface-700 mb-1">Sube tu ticket o factura</p>
                <p className="text-surface-400 text-sm">Foto (JPG, PNG) o PDF · Máx. 10MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl border border-surface-100">
                  {scannedPreview ? (
                    <img src={scannedPreview} alt="Ticket" className="w-20 h-20 object-cover rounded-xl border border-surface-200" />
                  ) : (
                    <div className="w-20 h-20 bg-brand-50 rounded-xl flex items-center justify-center">
                      <FileImage className="w-8 h-8 text-brand-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 text-sm truncate">{scannedFile.name}</p>
                    <p className="text-surface-400 text-xs mt-0.5">
                      {(scannedFile.size / 1024).toFixed(0)} KB · {scannedFile.type.includes('pdf') ? 'PDF' : 'Imagen'}
                    </p>
                  </div>
                  <button onClick={clearScan} className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-50 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Botón analizar */}
                {!confidence && (
                  <button
                    onClick={handleScan}
                    disabled={scanning}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
                  >
                    {scanning ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Analizando con IA...</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Analizar con IA</>
                    )}
                  </button>
                )}

                {/* Banner de confianza */}
                {confidence && (
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    confidence === 'alta'  ? 'bg-emerald-50 border border-emerald-100' :
                    confidence === 'media' ? 'bg-amber-50 border border-amber-100' :
                                            'bg-red-50 border border-red-100'
                  )}>
                    {confidence === 'alta'
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    }
                    <p className={cn('text-sm font-medium',
                      confidence === 'alta'  ? 'text-emerald-800' :
                      confidence === 'media' ? 'text-amber-800' : 'text-red-800'
                    )}>
                      {confidence === 'alta'  ? 'Datos extraídos con alta confianza — revisa y guarda' :
                       confidence === 'media' ? 'Confianza media — revisa los datos antes de guardar' :
                                               'Baja confianza — revisa todos los campos manualmente'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Formulario (aparece tras escanear) */}
          {confidence && (
            <form onSubmit={handleSave} className="px-6 pb-6 space-y-4 border-t border-surface-100 pt-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Datos extraídos — revisa y confirma</p>

              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-surface-700">Descripción *</label>
                <input name="description" required value={form.description} onChange={handleChange}
                  placeholder="Descripción del gasto" className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Fecha</label>
                  <input name="date" type="date" value={form.date} onChange={handleChange} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Categoría</label>
                  <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Proveedor</label>
                  <input name="provider" value={form.provider} onChange={handleChange} placeholder="Nombre empresa" className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Nº factura/ticket</label>
                  <input name="invoice_ref" value={form.invoice_ref} onChange={handleChange} placeholder="REF-001" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Base imponible (€)</label>
                  <input name="amount" type="number" min="0" step="0.01" required
                    value={form.amount} onChange={handleChange} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">IVA</label>
                  <select name="tax_rate" value={form.tax_rate} onChange={handleChange} className={inputClass}>
                    {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700">Total</label>
                  <div className="px-3.5 py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-sm font-bold text-brand-700">
                    {formatCurrency(total)}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeForm}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-surface-600 text-sm hover:bg-surface-50 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirmar y guardar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── MODO MANUAL ── */}
      {formMode === 'manual' && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900">Nuevo gasto manual</h3>
            <button onClick={closeForm} className="text-surface-400 hover:text-surface-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Descripción *</label>
              <input name="description" required value={form.description} onChange={handleChange}
                placeholder="Ej: Licencia Adobe Creative Cloud" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Fecha</label>
              <input name="date" type="date" required value={form.date} onChange={handleChange} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Categoría</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Base imponible (€) *</label>
              <input name="amount" type="number" min="0" step="0.01" required
                value={form.amount} onChange={handleChange} placeholder="0.00" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Tipo IVA</label>
              <select name="tax_rate" value={form.tax_rate} onChange={handleChange} className={inputClass}>
                {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            {amount > 0 && (
              <div className="col-span-2 bg-surface-50 rounded-xl p-3 flex gap-6 text-sm">
                <div><p className="text-xs text-surface-400">Base</p><p className="font-semibold">{formatCurrency(amount)}</p></div>
                <div><p className="text-xs text-surface-400">IVA</p><p className="font-semibold text-emerald-600">{formatCurrency(taxAmount)}</p></div>
                <div><p className="text-xs text-surface-400">Total</p><p className="font-bold">{formatCurrency(total)}</p></div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Proveedor</label>
              <input name="provider" value={form.provider} onChange={handleChange} placeholder="Nombre empresa" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Nº factura</label>
              <input name="invoice_ref" value={form.invoice_ref} onChange={handleChange} placeholder="REF-001" className={inputClass} />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={closeForm}
                className="px-4 py-2 rounded-xl border border-surface-200 text-surface-600 text-sm hover:bg-surface-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Guardar gasto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar gasto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3.5 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="all">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-surface-200 p-14 text-center shadow-soft">
          <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-7 h-7 text-surface-400" />
          </div>
          <p className="text-surface-700 font-semibold">No hay gastos registrados</p>
          <p className="text-surface-400 text-sm mt-1 mb-5">Sube un ticket o añade un gasto manualmente</p>
          <button onClick={() => openForm('scan')}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all mr-2">
            <Camera className="w-4 h-4" /> Escanear ticket
          </button>
          <button onClick={() => openForm('manual')}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Añadir manual
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Descripción</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase hidden md:table-cell">Categoría</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase hidden lg:table-cell">Fecha</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Base</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">IVA</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Total</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id} className="border-b border-surface-50 last:border-0 hover:bg-surface-50 transition-colors group">
                  <td className="px-5 py-4">
                    <p className="font-medium text-surface-900 text-sm">{exp.description}</p>
                    {exp.provider && <p className="text-surface-400 text-xs mt-0.5">{exp.provider}</p>}
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="px-2.5 py-1 rounded-lg bg-surface-100 text-surface-600 text-xs font-medium">
                      {catLabel[exp.category] ?? exp.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-surface-400 text-sm hidden lg:table-cell">{formatDateShort(exp.date)}</td>
                  <td className="px-5 py-4 text-right text-surface-600 text-sm">{formatCurrency(exp.amount)}</td>
                  <td className="px-5 py-4 text-right text-emerald-600 text-sm font-medium">{formatCurrency(exp.tax_amount)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-surface-900 text-sm">{formatCurrency(exp.total)}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => handleDelete(exp.id)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-400 hover:bg-red-50 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-50 border-t border-surface-200">
              <tr>
                <td colSpan={3} className="px-5 py-3 text-sm font-bold text-surface-900">TOTAL</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-surface-900">{formatCurrency(filtered.reduce((s,e) => s+e.amount, 0))}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-emerald-600">{formatCurrency(totalIvaSoportado)}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-surface-900">{formatCurrency(totalGastos)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}