'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Sparkles, ArrowRight, Mail, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message
      )
      setLoading(false)
      return
    }

    toast.success('¡Bienvenido de nuevo!')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Panel izquierdo - decorativo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-16 flex-col justify-between relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">AI Quote & Invoice</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            Presupuestos<br />profesionales en<br />
            <span className="text-blue-200">segundos con IA</span>
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Describe tu proyecto, y la inteligencia artificial generará un presupuesto detallado listo para enviar.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { emoji: '⚡', text: 'Genera presupuestos en segundos' },
            { emoji: '📄', text: 'Convierte a factura con un clic' },
            { emoji: '📥', text: 'Exporta a PDF profesional' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-lg">{item.emoji}</span>
              <span className="text-blue-100 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho - formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-surface-900">AI Quote & Invoice</span>
          </div>

          <h2 className="text-2xl font-bold text-surface-900 mb-1">Iniciar sesión</h2>
          <p className="text-surface-500 text-sm mb-8">
            ¿Sin cuenta?{' '}
            <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200',
                    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    'transition-all'
                  )}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-surface-700">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200',
                    'bg-white text-surface-900 text-sm placeholder:text-surface-400',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
                    'transition-all'
                  )}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'bg-brand-600 hover:bg-brand-700 active:bg-brand-800',
                'text-white font-semibold text-sm py-3 rounded-xl',
                'transition-all shadow-brand',
                'disabled:opacity-60 disabled:cursor-not-allowed'
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
