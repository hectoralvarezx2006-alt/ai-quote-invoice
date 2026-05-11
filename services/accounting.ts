import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

// ── TIPOS ────────────────────────────────────────────────────

export interface MonthlyData {
  month: string
  monthNum: number
  year: number
  facturado: number
  cobrado: number
  gastos: number
  beneficio: number
}

export interface QuarterSummary {
  quarter: number
  year: number
  // Ingresos
  baseImponible: number
  iva21base: number; iva21cuota: number
  iva10base: number; iva10cuota: number
  iva4base: number;  iva4cuota: number
  totalIvaRepercutido: number
  totalFacturado: number
  totalCobrado: number
  numFacturas: number
  // Gastos
  totalGastosBase: number
  totalIvaSoportado: number
  totalGastos: number
  numGastos: number
  // Resultado 303
  ivaDiferencia: number   // repercutido - soportado
  beneficioNeto: number   // cobrado - gastos
}

export interface InvoiceRow {
  invoice_number: string
  client_name: string
  issue_date: string
  due_date: string
  base: number
  tax_rate: number
  tax_amount: number
  total: number
  status: string
}

export interface ExpenseRow {
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
}

export interface TopClient {
  client_name: string
  total: number
  numFacturas: number
  cobrado: number
}

export interface OverdueInvoice {
  invoice_number: string
  client_name: string
  client_email: string | null
  due_date: string
  total: number
  days_overdue: number
}

export interface TaxForecast {
  quarter: number
  year: number
  estimatedRevenue: number
  estimatedIva: number
  estimatedIrpf: number
  estimatedIrpfRate: number
}

export const EXPENSE_CATEGORIES = [
  { value: 'material', label: 'Material y suministros' },
  { value: 'software', label: 'Software y suscripciones' },
  { value: 'transporte', label: 'Transporte y gasolina' },
  { value: 'telefono', label: 'Teléfono e internet' },
  { value: 'oficina', label: 'Oficina y alquiler' },
  { value: 'marketing', label: 'Marketing y publicidad' },
  { value: 'formacion', label: 'Formación' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'asesoria', label: 'Asesoría y gestoría' },
  { value: 'otros', label: 'Otros gastos' },
]

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const QUARTER_MONTHS: Record<number, number[]> = {
  1: [1,2,3], 2: [4,5,6], 3: [7,8,9], 4: [10,11,12],
}

function quarterDateRange(quarter: number, year: number) {
  const months = QUARTER_MONTHS[quarter]
  const startMonth = String(months[0]).padStart(2, '0')
  const endMonth   = String(months[2]).padStart(2, '0')
  const lastDay    = new Date(year, months[2], 0).getDate()
  return {
    start: `${year}-${startMonth}-01`,
    end:   `${year}-${endMonth}-${lastDay}`,
  }
}

// ── 1. DATOS MENSUALES PARA EL GRÁFICO ───────────────────────
export async function getMonthlyData(year: number): Promise<MonthlyData[]> {
  const supabase = createClient()

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from('invoices').select('total, status, issue_date')
      .gte('issue_date', `${year}-01-01`)
      .lte('issue_date', `${year}-12-31`),
    supabase.from('expenses').select('total, date')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`),
  ])

  const map: Record<number, MonthlyData> = {}
  for (let m = 1; m <= 12; m++) {
    map[m] = { month: MONTH_NAMES[m-1], monthNum: m, year, facturado: 0, cobrado: 0, gastos: 0, beneficio: 0 }
  }

  for (const inv of invoices ?? []) {
    const m = new Date(inv.issue_date).getMonth() + 1
    map[m].facturado += inv.total ?? 0
    if (inv.status === 'paid') map[m].cobrado += inv.total ?? 0
  }

  for (const exp of expenses ?? []) {
    const m = new Date(exp.date).getMonth() + 1
    map[m].gastos += exp.total ?? 0
  }

  for (const m of Object.values(map)) {
    m.beneficio = Math.max(0, m.cobrado - m.gastos)
  }

  return Object.values(map)
}

// ── 2. RESUMEN TRIMESTRAL COMPLETO (303) ─────────────────────
export async function getQuarterSummary(quarter: number, year: number): Promise<QuarterSummary> {
  const supabase = createClient()
  const { start, end } = quarterDateRange(quarter, year)

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from('invoices').select('*').gte('issue_date', start).lte('issue_date', end),
    supabase.from('expenses').select('*').gte('date', start).lte('date', end),
  ])

  const s: QuarterSummary = {
    quarter, year,
    baseImponible: 0,
    iva21base: 0, iva21cuota: 0,
    iva10base: 0, iva10cuota: 0,
    iva4base: 0,  iva4cuota: 0,
    totalIvaRepercutido: 0,
    totalFacturado: 0, totalCobrado: 0, numFacturas: 0,
    totalGastosBase: 0, totalIvaSoportado: 0, totalGastos: 0, numGastos: 0,
    ivaDiferencia: 0, beneficioNeto: 0,
  }

  for (const inv of invoices ?? []) {
    s.numFacturas++
    s.baseImponible   += inv.subtotal ?? 0
    s.totalFacturado  += inv.total ?? 0
    if (inv.status === 'paid') s.totalCobrado += inv.total ?? 0
    const rate = inv.tax_rate ?? 21
    const base = inv.subtotal ?? 0
    const cuota = inv.tax_amount ?? 0
    if (rate === 21) { s.iva21base += base; s.iva21cuota += cuota }
    else if (rate === 10) { s.iva10base += base; s.iva10cuota += cuota }
    else if (rate === 4)  { s.iva4base  += base; s.iva4cuota  += cuota }
  }

  for (const exp of expenses ?? []) {
    s.numGastos++
    s.totalGastosBase    += exp.amount ?? 0
    s.totalIvaSoportado  += exp.tax_amount ?? 0
    s.totalGastos        += exp.total ?? 0
  }

  s.totalIvaRepercutido = s.iva21cuota + s.iva10cuota + s.iva4cuota
  s.ivaDiferencia  = s.totalIvaRepercutido - s.totalIvaSoportado
  s.beneficioNeto  = s.totalCobrado - s.totalGastos

  return s
}

// ── 3. FACTURAS DEL TRIMESTRE ─────────────────────────────────
export async function getQuarterInvoices(quarter: number, year: number): Promise<InvoiceRow[]> {
  const supabase = createClient()
  const { start, end } = quarterDateRange(quarter, year)
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number, client_name, issue_date, due_date, subtotal, tax_rate, tax_amount, total, status')
    .gte('issue_date', start).lte('issue_date', end)
    .order('issue_date', { ascending: true })
  return (data ?? []).map(inv => ({
    invoice_number: inv.invoice_number,
    client_name:    inv.client_name,
    issue_date:     inv.issue_date,
    due_date:       inv.due_date,
    base:           inv.subtotal ?? 0,
    tax_rate:       inv.tax_rate ?? 21,
    tax_amount:     inv.tax_amount ?? 0,
    total:          inv.total ?? 0,
    status:         inv.status,
  }))
}

// ── 4. GASTOS DEL TRIMESTRE ───────────────────────────────────
export async function getQuarterExpenses(quarter: number, year: number): Promise<ExpenseRow[]> {
  const supabase = createClient()
  const { start, end } = quarterDateRange(quarter, year)
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .gte('date', start).lte('date', end)
    .order('date', { ascending: true })
  return (data ?? []).map(e => ({
    id: e.id, date: e.date, description: e.description,
    category: e.category, amount: e.amount ?? 0,
    tax_rate: e.tax_rate ?? 21, tax_amount: e.tax_amount ?? 0,
    total: e.total ?? 0, provider: e.provider, invoice_ref: e.invoice_ref,
  }))
}

// ── 5. TOP CLIENTES ───────────────────────────────────────────
export async function getTopClients(year: number): Promise<TopClient[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('client_name, total, status')
    .gte('issue_date', `${year}-01-01`)
    .lte('issue_date', `${year}-12-31`)

  const map: Record<string, TopClient> = {}
  for (const inv of data ?? []) {
    if (!map[inv.client_name]) {
      map[inv.client_name] = { client_name: inv.client_name, total: 0, numFacturas: 0, cobrado: 0 }
    }
    map[inv.client_name].total += inv.total ?? 0
    map[inv.client_name].numFacturas++
    if (inv.status === 'paid') map[inv.client_name].cobrado += inv.total ?? 0
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8)
}

// ── 6. FACTURAS VENCIDAS ─────────────────────────────────────
export async function getOverdueInvoices(): Promise<OverdueInvoice[]> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number, client_name, client_email, due_date, total')
    .eq('status', 'pending')
    .lt('due_date', today)
    .order('due_date', { ascending: true })

  return (data ?? []).map(inv => {
    const days = Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / 86400000)
    return {
      invoice_number: inv.invoice_number,
      client_name:    inv.client_name,
      client_email:   inv.client_email,
      due_date:       inv.due_date,
      total:          inv.total ?? 0,
      days_overdue:   days,
    }
  })
}

// ── 7. PREVISIÓN DE IMPUESTOS ─────────────────────────────────
export async function getTaxForecast(year: number): Promise<TaxForecast[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('total, subtotal, tax_amount, issue_date, status')
    .gte('issue_date', `${year}-01-01`)
    .lte('issue_date', `${year}-12-31`)

  const forecasts: TaxForecast[] = []

  for (let q = 1; q <= 4; q++) {
    const months = QUARTER_MONTHS[q]
    const qInvoices = (data ?? []).filter(inv => {
      const m = new Date(inv.issue_date).getMonth() + 1
      return months.includes(m)
    })

    const revenue  = qInvoices.reduce((s, i) => s + (i.subtotal ?? 0), 0)
    const iva      = qInvoices.reduce((s, i) => s + (i.tax_amount ?? 0), 0)
    // IRPF estimado: 15% sobre base (autónomo general), 7% primer año
    const irpfRate = 15
    const irpf     = revenue * (irpfRate / 100)

    forecasts.push({ quarter: q, year, estimatedRevenue: revenue, estimatedIva: iva, estimatedIrpf: irpf, estimatedIrpfRate: irpfRate })
  }

  return forecasts
}

// ── 8. EXPORTAR EXCEL COMPLETO ────────────────────────────────
export async function exportToExcel(
  invoices: InvoiceRow[],
  expenses: ExpenseRow[],
  summary: QuarterSummary
): Promise<void> {
  const XLSX = await import('xlsx')
  const quarterLabel = `${summary.quarter}T${summary.year}`

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida', cancelled: 'Cancelada',
  }

  const catLabel: Record<string, string> = Object.fromEntries(
    EXPENSE_CATEGORIES.map(c => [c.value, c.label])
  )

  // Hoja 1: Facturas
  const invoiceRows = [
    ['Nº Factura','Cliente','Fecha emisión','Fecha vencimiento','Base imponible','IVA %','Cuota IVA','Total','Estado'],
    ...invoices.map(inv => [
      inv.invoice_number, inv.client_name, inv.issue_date, inv.due_date,
      inv.base, `${inv.tax_rate}%`, inv.tax_amount, inv.total,
      statusLabel[inv.status] ?? inv.status,
    ]),
    [],
    ['','','','TOTALES', summary.baseImponible,'', summary.totalIvaRepercutido, summary.totalFacturado,''],
  ]

  // Hoja 2: Gastos
  const expenseRows = [
    ['Fecha','Descripción','Categoría','Proveedor','Base','IVA %','Cuota IVA','Total'],
    ...expenses.map(e => [
      e.date, e.description, catLabel[e.category] ?? e.category,
      e.provider ?? '', e.amount, `${e.tax_rate}%`, e.tax_amount, e.total,
    ]),
    [],
    ['','','','TOTALES', summary.totalGastosBase,'', summary.totalIvaSoportado, summary.totalGastos],
  ]

  // Hoja 3: Modelo 303
  const model303 = [
    [`MODELO 303 — IVA TRIMESTRAL — ${quarterLabel}`],
    [],
    ['INGRESOS (IVA REPERCUTIDO)','BASE IMPONIBLE','TIPO %','CUOTA IVA'],
    ['IVA repercutido 21%', summary.iva21base, '21%', summary.iva21cuota],
    ['IVA repercutido 10%', summary.iva10base, '10%', summary.iva10cuota],
    ['IVA repercutido 4%',  summary.iva4base,  '4%',  summary.iva4cuota],
    [],
    ['GASTOS (IVA SOPORTADO)','BASE','','CUOTA IVA'],
    ['Total gastos deducibles', summary.totalGastosBase,'', summary.totalIvaSoportado],
    [],
    ['LIQUIDACIÓN','','',''],
    ['IVA repercutido (casilla 03)', '', '', summary.totalIvaRepercutido],
    ['IVA soportado (casilla 22)',   '', '', summary.totalIvaSoportado],
    ['RESULTADO (a ingresar / devolver)', '', '', summary.ivaDiferencia],
    [],
    ['RESUMEN ECONÓMICO','','',''],
    ['Total facturado',  '', '', summary.totalFacturado],
    ['Total cobrado',    '', '', summary.totalCobrado],
    ['Total gastos',     '', '', summary.totalGastos],
    ['Beneficio neto',   '', '', summary.beneficioNeto],
    [],
    ['* Documento orientativo. Consulta con tu gestoría antes de presentar.'],
  ]

  const wb = XLSX.utils.book_new()

  const ws1 = XLSX.utils.aoa_to_sheet(invoiceRows)
  ws1['!cols'] = [{wch:18},{wch:28},{wch:14},{wch:16},{wch:16},{wch:8},{wch:12},{wch:14},{wch:12}]
  XLSX.utils.book_append_sheet(wb, ws1, 'Facturas')

  const ws2 = XLSX.utils.aoa_to_sheet(expenseRows)
  ws2['!cols'] = [{wch:12},{wch:30},{wch:22},{wch:20},{wch:14},{wch:8},{wch:12},{wch:14}]
  XLSX.utils.book_append_sheet(wb, ws2, 'Gastos')

  const ws3 = XLSX.utils.aoa_to_sheet(model303)
  ws3['!cols'] = [{wch:36},{wch:16},{wch:10},{wch:16}]
  XLSX.utils.book_append_sheet(wb, ws3, 'Modelo 303')

  XLSX.writeFile(wb, `Contabilidad_${quarterLabel}.xlsx`)
}
