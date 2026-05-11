'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, Loader2, Package, Edit3,
  Check, X, Search, ToggleLeft, ToggleRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import {
  getAllProducts, createProduct, updateProduct,
  deleteProduct, toggleProduct
} from '@/services/products'
import { UNITS, TAX_RATES, type Product } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'Diseño', 'Desarrollo', 'Consultoría', 'Marketing',
  'Fotografía', 'Redacción', 'Formación', 'Mantenimiento', 'Otros'
]

const emptyForm = {
  name: '', description: '', price: '',
  tax_rate: '21', unit: 'ud', category: '', active: true,
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch]     = useState('')
  const [form, setForm]         = useState(emptyForm)

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-xl border border-surface-200',
    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
  )

  async function load() {
    try {
      const data = await getAllProducts()
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function startEdit(product: Product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: String(product.price),
      tax_rate: String(product.tax_rate),
      unit: product.unit,
      category: product.category ?? '',
      active: product.active,
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price) return
    setSaving(true)
    try {
      const data = {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        tax_rate: parseFloat(form.tax_rate),
        unit: form.unit,
        category: form.category || null,
        active: true,
      }
      if (editingId) {
        await updateProduct(editingId, data)
        toast.success('Producto actualizado')
      } else {
        await createProduct(data)
        toast.success('Producto añadido al catálogo')
      }
      cancelEdit()
      load()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return
    await deleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
    toast.success('Producto eliminado')
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleProduct(id, !current)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !current } : p))
  }

  const filtered = products.filter(p =>
    search === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5 animate-fade-in">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Catálogo de productos</h2>
          <p className="text-surface-500 text-sm mt-0.5">
            Servicios y productos predefinidos para añadir rápidamente a presupuestos
          </p>
        </div>
        <button
          onClick={() => { cancelEdit(); setShowForm(!showForm) }}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-brand"
        >
          <Plus className="w-4 h-4" />
          Añadir producto
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6 animate-slide-up">
          <h3 className="font-semibold text-surface-900 mb-4">
            {editingId ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Nombre *</label>
              <input name="name" required value={form.name} onChange={handleChange}
                placeholder="Ej: Diseño de logotipo" className={inputClass} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Descripción</label>
              <textarea name="description" value={form.description} onChange={handleChange}
                rows={2} placeholder="Descripción breve del servicio"
                className={cn(inputClass, 'resize-none')} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Precio (€) *</label>
              <input name="price" type="number" min="0" step="0.01" required
                value={form.price} onChange={handleChange}
                placeholder="0.00" className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Unidad</label>
              <select name="unit" value={form.unit} onChange={handleChange} className={inputClass}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label} ({u.value})</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">IVA</label>
              <select name="tax_rate" value={form.tax_rate} onChange={handleChange} className={inputClass}>
                {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Categoría</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                <option value="">Sin categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Preview precio */}
            {form.price && (
              <div className="col-span-2 bg-surface-50 rounded-xl p-3 flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-surface-400">Base</p>
                  <p className="font-semibold">{formatCurrency(parseFloat(form.price) || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">IVA ({form.tax_rate}%)</p>
                  <p className="font-semibold text-brand-600">
                    {formatCurrency((parseFloat(form.price) || 0) * (parseFloat(form.tax_rate) / 100))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-400">Total</p>
                  <p className="font-bold">
                    {formatCurrency((parseFloat(form.price) || 0) * (1 + parseFloat(form.tax_rate) / 100))}
                  </p>
                </div>
              </div>
            )}

            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={cancelEdit}
                className="px-4 py-2 rounded-xl border border-surface-200 text-surface-600 text-sm hover:bg-surface-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingId ? 'Actualizar' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-surface-200 p-14 text-center shadow-soft">
          <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-brand-500" />
          </div>
          <p className="text-surface-700 font-semibold">Catálogo vacío</p>
          <p className="text-surface-400 text-sm mt-1 mb-5">
            Añade tus servicios habituales para crear presupuestos más rápido
          </p>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Añadir primer producto
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id}
              className={cn(
                'bg-white rounded-2xl border p-5 shadow-soft transition-all group',
                product.active ? 'border-surface-100 hover:border-surface-200' : 'border-surface-100 opacity-60'
              )}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-500" />
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => startEdit(product)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleToggle(product.id, product.active)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                    {product.active
                      ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                      : <ToggleLeft className="w-4 h-4" />
                    }
                  </button>
                  <button onClick={() => handleDelete(product.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4 className="font-semibold text-surface-900 text-sm mb-0.5">{product.name}</h4>
              {product.category && (
                <span className="inline-block text-xs px-2 py-0.5 bg-surface-100 text-surface-500 rounded-lg mb-2">
                  {product.category}
                </span>
              )}
              {product.description && (
                <p className="text-surface-400 text-xs leading-relaxed mb-3 line-clamp-2">{product.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-surface-50">
                <div>
                  <p className="font-bold text-surface-900">{formatCurrency(product.price)}</p>
                  <p className="text-xs text-surface-400">por {product.unit} · IVA {product.tax_rate}%</p>
                </div>
                {!product.active && (
                  <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded-lg">Inactivo</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}