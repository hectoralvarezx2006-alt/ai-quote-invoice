'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Sparkles, ArrowRight, Mail, Lock, Building2, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    company_name: '',
    nif: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          company_name: form.company_name,
          nif: form.nif,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Crear perfil en tabla users
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email: form.email,
        company_name: form.company_name || null,
        nif: form.nif || null,
      })
    }

    toast.success('¡Cuenta creada! Revisa tu email para confirmarla.')
    router.push('/auth/login')
  }

  const inputClass = cn(
    'w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200',
    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
    'transition-all'
  )

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-surface-900">AI Quote & Invoice</span>
        </div>

        <h2 className="text-2xl font-bold text-surface-900 mb-1">Crear cuenta</h2>
        <p className="text-surface-500 text-sm mb-8">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-surface-700">Contraseña *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                name="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
              />
            </div>
          </div>

          <div className="border-t border-surface-100 pt-4">
            <p className="text-xs text-surface-400 mb-4 uppercase tracking-wide font-medium">
              Datos de empresa (opcional)
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700">Nombre de empresa</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    name="company_name"
                    type="text"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Mi Empresa S.L."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700">NIF / CIF</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    name="nif"
                    type="text"
                    value={form.nif}
                    onChange={handleChange}
                    placeholder="B12345678"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'bg-brand-600 hover:bg-brand-700 active:bg-brand-800',
              'text-white font-semibold text-sm py-3 rounded-xl',
              'transition-all shadow-brand mt-2',
              'disabled:opacity-60 disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Crear cuenta gratuita
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-xs text-center text-surface-400">
            Al registrarte aceptas nuestros términos de servicio y política de privacidad.
          </p>
        </form>
      </div>
    </div>
  )
}
