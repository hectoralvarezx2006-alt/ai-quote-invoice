'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  TrendingUp, FileSpreadsheet, Loader2,
  ChevronLeft, ChevronRight, AlertTriangle,
  Users, Calculator, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import { formatCurrency, formatDateShort, getInvoiceStatusColor, getInvoiceStatusLabel } from '@/lib/utils'
import {
  getMonthlyData, getQuarterSummary, getQuarterInvoices,
  getQuarterExpenses, getTopClients, getOverdueInvoices,
  getTaxForecast, exportToExcel,
  type MonthlyData, type QuarterSummary, type InvoiceRow,
  type ExpenseRow, type TopClient, type OverdueInvoice, type TaxForecast,
} from '@/services/accounting'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const QUARTERS = [
  { value: 1, label: '1T', months: 'Ene–Mar' },
  { value: 2, label: '2T', months: 'Abr–Jun' },
  { value: 3, label: '3T', months: 'Jul–Sep' },
  { value: 4, label: '4T', months: 'Oct–Dic' },
]

const PIE_COLORS = ['#3b6ef6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316']

function getCurrentQuarter() {
  return Math.ceil((new Date().getMonth() + 1) / 3)
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-900 text-white rounded-xl p-3 shadow-modal text-sm">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</p>
      ))}
    </div>
  )
}

type Tab = 'resumen' | 'clientes' | 'vencidas' | 'prevision'

export default function AccountingPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [quarter, setQuarter] = useState(getCurrentQuarter())
  const [tab, setTab] = useState<Tab>('resumen')
  const [exporting, setExporting] = useState(false)

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [summary, setSummary] = useState<QuarterSummary | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [overdue, setOverdue] = useState<OverdueInvoice[]>([])
  const [forecast, setForecast] = useState<TaxForecast[]>([])

  const [loadingChart, setLoadingChart] = useState(true)
  const [loadingQuarter, setLoadingQuarter] = useState(true)
  const [loadingExtra, setLoadingExtra] = useState(true)

  useEffect(() => {
    setLoadingChart(true)
    getMonthlyData(year).then(d => { setMonthlyData(d); setLoadingChart(false) })
  }, [year])

  useEffect(() => {
    setLoadingQuarter(true)
    Promise.all([
      getQuarterSummary(quarter, year),
      getQuarterInvoices(quarter, year),
      getQuarterExpenses(quarter, year),
    ]).then(([s, inv, exp]) => {
      setSummary(s); setInvoices(inv); setExpenses(exp)
      setLoadingQuarter(false)
    })
  }, [quarter, year])

  useEffect(() => {
    setLoadingExtra(true)
    Promise.all([
      getTopClients(year),
      getOverdueInvoices(),
      getTaxForecast(year),
    ]).then(([tc, ov, fc]) => {
      setTopClients(tc); setOverdue(ov); setForecast(fc)
      setLoadingExtra(false)
    })
  }, [year])

  async function handleExport() {
    if (!summary) return
    setExporting(true)
    try { await exportToExcel(invoices, expenses, summary) }
    finally { setExporting(false) }
  }

  // Datos gráfico top clientes (pie)
  const pieData = topClients.slice(0, 6).map(c => ({
    name: c.client_name.split(' ')[0],
    value: c.total,
  }))

  const tabs = [
    { id: 'resumen' as Tab,   label: 'Resumen 303' },
    { id: 'clientes' as Tab,  label: `Top clientes` },
    { id: 'vencidas' as Tab,  label: `Vencidas ${overdue.length > 0 ? `(${overdue.length})` : ''}` },
    { id: 'prevision' as Tab, label: 'Previsión fiscal' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Contabilidad</h2>
          <p className="text-surface-500 text-sm mt-0.5">Facturación, IVA trimestral y análisis fiscal</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/expenses"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-surface-200 bg-white text-surface-700 text-sm font-medium hover:bg-surface-50 transition-all"
          >
            Gestionar gastos
          </Link>
          <div className="flex items-center gap-1.5 bg-white border border-surface-200 rounded-xl px-3 py-2">
            <button onClick={() => setYear(y => y - 1)} className="text-surface-400 hover:text-surface-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-surface-900 text-sm w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} disabled={year >= currentYear}
              className="text-surface-400 hover:text-surface-700 transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GRÁFICO ANUAL */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-surface-900">Evolución mensual {year}</h3>
          <div className="flex items-center gap-4 text-xs">
            {[
              { color: '#3b6ef6', label: 'Facturado' },
              { color: '#10b981', label: 'Cobrado' },
              { color: '#f87171', label: 'Gastos' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-surface-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
        {loadingChart ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={2} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ba3bc' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ba3bc' }} axisLine={false} tickLine={false}
                tickFormatter={v => v === 0 ? '0' : `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0f2f7' }} />
              <Bar dataKey="facturado" name="Facturado" fill="#3b6ef6" radius={[3,3,0,0]} />
              <Bar dataKey="cobrado"   name="Cobrado"   fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="gastos"    name="Gastos"    fill="#f87171" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* SELECTOR TRIMESTRE */}
      <div className="grid grid-cols-4 gap-3">
        {QUARTERS.map(q => (
          <button key={q.value} onClick={() => setQuarter(q.value)}
            className={cn(
              'rounded-2xl p-4 text-left border transition-all',
              quarter === q.value
                ? 'bg-brand-600 border-brand-600 text-white shadow-brand'
                : 'bg-white border-surface-100 text-surface-700 hover:border-surface-200 shadow-soft'
            )}>
            <p className={cn('text-xl font-bold', quarter === q.value ? 'text-white' : 'text-surface-900')}>{q.label}</p>
            <p className={cn('text-xs mt-0.5', quarter === q.value ? 'text-blue-200' : 'text-surface-400')}>{q.months}</p>
          </button>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-surface-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
              tab === t.id ? 'bg-white text-surface-900 shadow-soft' : 'text-surface-500 hover:text-surface-700'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: RESUMEN 303 ── */}
      {tab === 'resumen' && (
        loadingQuarter ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : summary && (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Base imponible', value: summary.baseImponible, color: 'text-surface-900' },
                { label: 'IVA repercutido', value: summary.totalIvaRepercutido, color: 'text-brand-600' },
                { label: 'IVA soportado', value: summary.totalIvaSoportado, color: 'text-emerald-600' },
                { label: 'IVA a ingresar', value: summary.ivaDiferencia, color: summary.ivaDiferencia >= 0 ? 'text-red-600' : 'text-emerald-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-surface-100 p-4 shadow-soft">
                  <p className="text-xs text-surface-400 mb-1">{label}</p>
                  <p className={cn('text-xl font-bold', color)}>{formatCurrency(value)}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Desglose IVA */}
              <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
                <div className="px-5 py-3.5 border-b border-surface-100 bg-surface-50 flex items-center justify-between">
                  <p className="font-semibold text-surface-900 text-sm">Modelo 303 — {quarter}T{year}</p>
                  <button onClick={handleExport} disabled={exporting || (invoices.length === 0 && expenses.length === 0)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all disabled:opacity-50">
                    {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                    Exportar Excel
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-50">
                      <th className="text-left px-5 py-2.5 text-xs text-surface-400">Concepto</th>
                      <th className="text-right px-5 py-2.5 text-xs text-surface-400">Base</th>
                      <th className="text-right px-5 py-2.5 text-xs text-surface-400">Cuota</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-surface-50 bg-blue-50/30">
                      <td colSpan={3} className="px-5 py-2 text-xs font-semibold text-brand-600 uppercase tracking-wide">IVA Repercutido</td>
                    </tr>
                    {[
                      { label: 'IVA 21%', base: summary.iva21base, cuota: summary.iva21cuota },
                      { label: 'IVA 10%', base: summary.iva10base, cuota: summary.iva10cuota },
                      { label: 'IVA 4%',  base: summary.iva4base,  cuota: summary.iva4cuota },
                    ].map(row => (
                      <tr key={row.label} className={cn('border-b border-surface-50', row.base === 0 && 'opacity-40')}>
                        <td className="px-5 py-3 text-sm text-surface-700">{row.label}</td>
                        <td className="px-5 py-3 text-sm text-right text-surface-600">{formatCurrency(row.base)}</td>
                        <td className="px-5 py-3 text-sm text-right font-medium text-surface-900">{formatCurrency(row.cuota)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-surface-100 bg-emerald-50/30">
                      <td colSpan={3} className="px-5 py-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">IVA Soportado (gastos)</td>
                    </tr>
                    <tr className="border-b border-surface-50">
                      <td className="px-5 py-3 text-sm text-surface-700">Gastos deducibles</td>
                      <td className="px-5 py-3 text-sm text-right text-surface-600">{formatCurrency(summary.totalGastosBase)}</td>
                      <td className="px-5 py-3 text-sm text-right font-medium text-emerald-600">{formatCurrency(summary.totalIvaSoportado)}</td>
                    </tr>
                    <tr className="bg-surface-50">
                      <td className="px-5 py-3 text-sm font-bold text-surface-900">RESULTADO</td>
                      <td className="px-5 py-3 text-sm text-right font-bold text-surface-900">{formatCurrency(summary.baseImponible)}</td>
                      <td className={cn('px-5 py-3 text-sm text-right font-bold text-lg',
                        summary.ivaDiferencia >= 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {formatCurrency(summary.ivaDiferencia)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="px-5 py-3 border-t border-surface-100">
                  <p className="text-xs text-surface-400 italic">
                    {summary.ivaDiferencia >= 0
                      ? '▲ A ingresar a Hacienda'
                      : '▼ A compensar o devolver'}
                    {' · '}Documento orientativo, consulta con tu gestoría.
                  </p>
                </div>
              </div>

              {/* Resumen económico */}
              <div className="space-y-3">
                <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-5">
                  <h4 className="font-semibold text-surface-900 text-sm mb-4">Resultado económico</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Total facturado', value: summary.totalFacturado, icon: ArrowUpRight, color: 'text-brand-600' },
                      { label: 'Total cobrado', value: summary.totalCobrado, icon: ArrowUpRight, color: 'text-emerald-600' },
                      { label: 'Total gastos', value: summary.totalGastos, icon: ArrowDownRight, color: 'text-red-500' },
                    ].map(({ label, value, icon: Icon, color }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-4 h-4', color)} />
                          <span className="text-sm text-surface-600">{label}</span>
                        </div>
                        <span className={cn('font-semibold text-sm', color)}>{formatCurrency(value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-bold text-surface-900">Beneficio neto</span>
                      <span className={cn('font-bold text-lg', summary.beneficioNeto >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {formatCurrency(summary.beneficioNeto)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  'rounded-2xl p-5',
                  summary.ivaDiferencia >= 0 ? 'bg-red-50 border border-red-100' : 'bg-emerald-50 border border-emerald-100'
                )}>
                  <p className={cn('text-xs font-semibold uppercase tracking-wide mb-1',
                    summary.ivaDiferencia >= 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {summary.ivaDiferencia >= 0 ? 'IVA a ingresar este trimestre' : 'IVA a tu favor'}
                  </p>
                  <p className={cn('text-3xl font-bold', summary.ivaDiferencia >= 0 ? 'text-red-700' : 'text-emerald-700')}>
                    {formatCurrency(Math.abs(summary.ivaDiferencia))}
                  </p>
                  <p className={cn('text-xs mt-1', summary.ivaDiferencia >= 0 ? 'text-red-400' : 'text-emerald-400')}>
                    {summary.numFacturas} facturas · {summary.numGastos} gastos
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── TAB: TOP CLIENTES ── */}
      {tab === 'clientes' && (
        loadingExtra ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-5">
            {/* Gráfico tarta */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-soft p-6">
              <h3 className="font-semibold text-surface-900 mb-4">Distribución por cliente {year}</h3>
              {topClients.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-surface-400 text-sm">Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ranking */}
            <div className="bg-white rounded-2xl border border-surface-100 shadow-soft overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-100">
                <h3 className="font-semibold text-surface-900">Ranking de clientes {year}</h3>
              </div>
              {topClients.length === 0 ? (
                <div className="p-10 text-center text-surface-400 text-sm">Sin facturas en {year}</div>
              ) : (
                <div className="divide-y divide-surface-50">
                  {topClients.map((client, i) => (
                    <div key={client.client_name} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-50 transition-colors">
                      <div className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-surface-100 text-surface-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-surface-50 text-surface-400'
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 text-sm truncate">{client.client_name}</p>
                        <p className="text-xs text-surface-400">{client.numFacturas} facturas · cobrado {formatCurrency(client.cobrado)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-surface-900 text-sm">{formatCurrency(client.total)}</p>
                        <div className="w-20 h-1.5 bg-surface-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(client.total / topClients[0].total) * 100}%`,
                              backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* ── TAB: VENCIDAS ── */}
      {tab === 'vencidas' && (
        loadingExtra ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            {overdue.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-emerald-800">¡Sin facturas vencidas!</p>
                <p className="text-emerald-600 text-sm mt-1">Todos los pagos están al día</p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-800 text-sm">
                      {overdue.length} {overdue.length === 1 ? 'factura vencida' : 'facturas vencidas'} —
                      {' '}{formatCurrency(overdue.reduce((s, i) => s + i.total, 0))} pendientes de cobro
                    </p>
                    <p className="text-red-600 text-xs mt-0.5">Contacta con los clientes para gestionar el pago</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-surface-100 overflow-hidden shadow-soft">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50">
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Factura</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Cliente</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase hidden md:table-cell">Venció</th>
                        <th className="text-center px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Días</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-400 uppercase">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdue.map(inv => (
                        <tr key={inv.invoice_number} className="border-b border-surface-50 last:border-0 hover:bg-red-50/30 transition-colors">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-surface-900">{inv.invoice_number}</td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-surface-900 text-sm">{inv.client_name}</p>
                            {inv.client_email && <p className="text-xs text-surface-400">{inv.client_email}</p>}
                          </td>
                          <td className="px-5 py-4 text-surface-500 text-sm hidden md:table-cell">{formatDateShort(inv.due_date)}</td>
                          <td className="px-5 py-4 text-center">
                            <span className={cn(
                              'px-2.5 py-1 rounded-lg text-xs font-semibold',
                              inv.days_overdue > 60 ? 'bg-red-100 text-red-700' :
                              inv.days_overdue > 30 ? 'bg-orange-100 text-orange-700' :
                              'bg-amber-100 text-amber-700'
                            )}>
                              +{inv.days_overdue}d
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-bold text-red-600 text-sm">{formatCurrency(inv.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )
      )}

      {/* ── TAB: PREVISIÓN FISCAL ── */}
      {tab === 'prevision' && (
        loadingExtra ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-brand-500 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-amber-800 text-sm">
                Estimación basada en las facturas emitidas en {year}. El IRPF estimado usa el tipo general del 15% (autónomo establecido).
                Consulta con tu gestoría para adaptarlo a tu situación personal.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              {forecast.map(fc => {
                const qData = QUARTERS.find(q => q.value === fc.quarter)
                const isCurrent = fc.quarter === getCurrentQuarter()
                return (
                  <div key={fc.quarter} className={cn(
                    'bg-white rounded-2xl border shadow-soft overflow-hidden',
                    isCurrent ? 'border-brand-200 ring-1 ring-brand-100' : 'border-surface-100'
                  )}>
                    <div className={cn(
                      'px-5 py-3.5 border-b flex items-center justify-between',
                      isCurrent ? 'bg-brand-50 border-brand-100' : 'bg-surface-50 border-surface-100'
                    )}>
                      <div className="flex items-center gap-2">
                        <p className={cn('font-bold text-lg', isCurrent ? 'text-brand-700' : 'text-surface-900')}>
                          {qData?.label}
                        </p>
                        <p className={cn('text-xs', isCurrent ? 'text-brand-500' : 'text-surface-400')}>
                          {qData?.months} {fc.year}
                        </p>
                      </div>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-semibold rounded-lg">
                          Trimestre actual
                        </span>
                      )}
                    </div>
                    <div className="p-5 grid grid-cols-3 gap-4">
                      {[
                        { label: 'Base estimada', value: fc.estimatedRevenue, color: 'text-surface-900' },
                        { label: `IVA (repercutido)`, value: fc.estimatedIva, color: 'text-brand-600' },
                        { label: `IRPF (~${fc.estimatedIrpfRate}%)`, value: fc.estimatedIrpf, color: 'text-amber-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <p className="text-xs text-surface-400 mb-1 leading-tight">{label}</p>
                          <p className={cn('font-bold text-base', color)}>{formatCurrency(value)}</p>
                        </div>
                      ))}
                    </div>
                    {fc.estimatedRevenue > 0 && (
                      <div className="px-5 pb-4">
                        <div className="bg-surface-50 rounded-xl p-3 text-xs text-surface-500">
                          💡 Reserva aprox. <strong className="text-surface-700">{formatCurrency(fc.estimatedIva + fc.estimatedIrpf)}</strong> para impuestos este trimestre
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
