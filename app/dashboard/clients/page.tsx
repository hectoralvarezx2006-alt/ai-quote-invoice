'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Users, Loader2, Trash2, Mail, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string | null
  nif: string | null
  phone: string | null
  address: string | null
  city: string | null
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', nif: '', phone: '', address: '', city: '' })

  const inputClass = cn(
    'w-full px-3.5 py-2.5 rounded-xl border border-surface-200',
    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
  )

  async function loadClients() {
    const supabase = createClient()
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('clients').insert({ ...form, user_id: user?.id })
      if (error) throw error
      toast.success('Cliente añadido')
      setForm({ name: '', email: '', nif: '', phone: '', address: '', city: '' })
      setShowForm(false)
      loadClients()
    } catch (err) {
      toast.error('Error al guardar cliente')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    const supabase = createClient()
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    toast.success('Cliente eliminado')
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Clientes</h2>
          <p className="text-surface-500 text-sm mt-0.5">{clients.length} clientes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-brand"
        >
          <Plus className="w-4 h-4" />
          Añadir cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6 animate-slide-up">
          <h3 className="font-semibold text-surface-900 mb-4">Nuevo cliente</h3>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Nombre *</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Empresa o persona" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="email@cliente.com" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">NIF/CIF</label>
              <input value={form.nif} onChange={e => setForm(p => ({ ...p, nif: e.target.value }))} placeholder="B12345678" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Teléfono</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+34 600 000 000" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Ciudad</label>
              <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Madrid" className={inputClass} />
            </div>
            <div className="col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-surface-200 text-surface-600 text-sm hover:bg-surface-50 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Guardar cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {clients.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {clients.map(client => (
            <div key={client.id} className="bg-white rounded-2xl border border-surface-100 p-5 shadow-soft hover:border-surface-200 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <span className="text-brand-600 font-bold text-sm uppercase">{client.name[0]}</span>
                </div>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-surface-300 hover:text-red-400 hover:bg-red-50 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="font-semibold text-surface-900">{client.name}</h4>
              {client.nif && <p className="text-xs text-surface-400 mt-0.5">NIF: {client.nif}</p>}
              <div className="mt-3 space-y-1.5">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-surface-500">
                    <Mail className="w-3.5 h-3.5" />
                    {client.email}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-surface-500">
                    <Phone className="w-3.5 h-3.5" />
                    {client.phone}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-surface-100 border-dashed p-16 text-center shadow-soft">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-amber-500" />
          </div>
          <p className="text-surface-700 font-semibold">No hay clientes</p>
          <p className="text-surface-400 text-sm mt-1">Añade clientes para reutilizarlos en presupuestos</p>
        </div>
      )}
    </div>
  )
}
