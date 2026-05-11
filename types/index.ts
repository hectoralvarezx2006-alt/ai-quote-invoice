// types/index.ts

export interface UserProfile {
  id: string
  email: string
  company_name: string | null
  nif: string | null
  logo_url: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  brand_color: string | null
  iban: string | null
  website: string | null
  invoice_series: string | null
  quote_series: string | null
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  name: string
  email: string | null
  nif: string | null
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  created_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface QuoteItem {
  id: string
  quote_id: string
  name: string
  description: string | null
  quantity: number
  price: number
  tax_rate: number      // IVA por línea
  tax_amount: number    // IVA calculado por línea
  subtotal: number      // base sin IVA
}

export interface Quote {
  id: string
  user_id: string
  client_id: string | null
  client_name: string
  client_email: string | null
  title: string
  description: string | null
  items: QuoteItem[]
  subtotal: number
  tax_rate: number      // IVA global (para compatibilidad)
  tax_amount: number
  total: number
  // IRPF
  apply_irpf?: boolean
  irpf_rate?: number
  irpf_amount?: number
  status: QuoteStatus
  notes: string | null
  valid_until: string | null
  public_token?: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  quote_id: string | null
  user_id: string
  client_name: string
  client_email: string | null
  invoice_number: string
  title: string
  description: string | null
  items: QuoteItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  // IRPF
  apply_irpf?: boolean
  irpf_rate?: number
  irpf_amount?: number
  status: InvoiceStatus
  issue_date: string
  due_date: string
  notes: string | null
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number
  tax_rate: number
  unit: string
  category: string | null
  active: boolean
  created_at: string
}

// AI generation types
export interface AIQuoteItem {
  name: string
  description: string
  quantity: number
  price: number
}

export interface AIQuoteResponse {
  title: string
  description: string
  items: AIQuoteItem[]
  total: number
  tone: string
  notes: string
}

export interface GenerateQuoteParams {
  jobDescription: string
  approximatePrice?: string
  clientType: string
  clientName?: string
}

// IRPF types
export const IRPF_RATES = [
  { label: '7% — Nuevo autónomo (primer año)', value: 7 },
  { label: '15% — General autónomo', value: 15 },
  { label: '19% — Artistas y deportistas', value: 19 },
]

export const TAX_RATES = [0, 4, 10, 21]

export const UNITS = [
  { value: 'ud',  label: 'Unidad' },
  { value: 'h',   label: 'Hora' },
  { value: 'día', label: 'Día' },
  { value: 'mes', label: 'Mes' },
  { value: 'km',  label: 'Kilómetro' },
  { value: 'kg',  label: 'Kilogramo' },
  { value: 'm2',  label: 'Metro cuadrado' },
  { value: 'l',   label: 'Litro' },
]