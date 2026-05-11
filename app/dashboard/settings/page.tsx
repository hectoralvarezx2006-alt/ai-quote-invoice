'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Save, Loader2, Building2, Mail, Phone, MapPin, Hash, Globe, Palette, CreditCard, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#3b6ef6', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#16a34a', '#0891b2', '#0f172a',
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    company_name: '',
    nif: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'España',
    website: '',
    iban: '',
    brand_color: '#3b6ef6',
    logo_url: '',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          company_name: data.company_name ?? '',
          nif: data.nif ?? '',
          email: data.email ?? user.email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          city: data.city ?? '',
          country: data.country ?? 'España',
          website: data.website ?? '',
          iban: data.iban ?? '',
          brand_color: data.brand_color ?? '#3b6ef6',
          logo_url: data.logo_url ?? '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no puede superar 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const ext = file.name.split('.').pop()
      const path = `logos/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(path)

      setForm(prev => ({ ...prev, logo_url: publicUrl }))
      toast.success('Logo subido correctamente')
    } catch (err) {
      toast.error('Error subiendo el logo. Asegúrate de crear el bucket "logos" en Supabase Storage.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const { error } = await supabase
        .from('users')
        .upsert({ id: user.id, ...form })

      if (error) throw error
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = cn(
    'w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200',
    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-surface-900">Configuración</h2>
        <p className="text-surface-500 text-sm mt-0.5">
          Estos datos aparecerán en tus presupuestos y facturas PDF
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">

        {/* MARCA */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50">
            <h3 className="font-semibold text-surface-700 text-sm flex items-center gap-2">
              <Palette className="w-4 h-4" /> Identidad de marca
            </h3>
          </div>
          <div className="p-6 space-y-5">

            {/* Logo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700">Logo de empresa</label>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <div className="relative">
                    <img
                      src={form.logo_url}
                      alt="Logo"
                      className="w-16 h-16 object-contain rounded-xl border border-surface-200 bg-surface-50 p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, logo_url: '' }))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 flex items-center justify-center bg-surface-50">
                    <Upload className="w-5 h-5 text-surface-300" />
                  </div>
                )}
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 bg-white text-surface-700 text-sm font-medium hover:bg-surface-50 transition-all disabled:opacity-60"
                  >
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
                  </button>
                  <p className="text-xs text-surface-400 mt-1">PNG, JPG o SVG. Máx. 2MB.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>

            {/* Color de marca */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700">Color de marca (PDF)</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, brand_color: color }))}
                    className={cn(
                      'w-8 h-8 rounded-lg transition-all',
                      form.brand_color === color && 'ring-2 ring-offset-2 ring-surface-400 scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={e => setForm(p => ({ ...p, brand_color: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-surface-200 cursor-pointer p-0.5 bg-white"
                  />
                  <span className="text-xs text-surface-400 font-mono">{form.brand_color}</span>
                </div>
              </div>
              {/* Preview */}
              <div
                className="mt-3 rounded-xl p-4 text-white text-sm font-medium flex items-center justify-between"
                style={{ backgroundColor: form.brand_color }}
              >
                <span>{form.company_name || 'Mi Empresa'}</span>
                <span className="opacity-70 text-xs">Vista previa PDF</span>
              </div>
            </div>
          </div>
        </div>

        {/* DATOS EMPRESA */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50">
            <h3 className="font-semibold text-surface-700 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Datos de empresa
            </h3>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Nombre de empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="company_name" value={form.company_name} onChange={handleChange} placeholder="Mi Empresa S.L." className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">NIF / CIF</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="nif" value={form.nif} onChange={handleChange} placeholder="B12345678" className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Teléfono</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+34 600 000 000" className={inputClass} />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Email de contacto</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="empresa@email.com" className={inputClass} />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="address" value={form.address} onChange={handleChange} placeholder="Calle Principal 123" className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Ciudad</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="city" value={form.city} onChange={handleChange} placeholder="Madrid" className={inputClass} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Web</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input name="website" value={form.website} onChange={handleChange} placeholder="www.miempresa.com" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        {/* DATOS DE PAGO */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50">
            <h3 className="font-semibold text-surface-700 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Datos de pago (aparece en facturas)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">IBAN</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  name="iban"
                  value={form.iban}
                  onChange={handleChange}
                  placeholder="ES12 3456 7890 1234 5678 9012"
                  className={inputClass}
                />
              </div>
              <p className="text-xs text-surface-400">Se muestra al pie de cada factura PDF para facilitar el pago</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-brand disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  )
}
