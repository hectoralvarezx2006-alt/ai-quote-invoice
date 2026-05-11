import { createClient } from '@/lib/supabase/client'
import type { Invoice, Quote } from '@/types'
import { toISODate, addDays } from '@/lib/utils'

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(`*, invoice_items(*)`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(inv => ({
    ...inv,
    items: inv.invoice_items ?? [],
  }))
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(`*, invoice_items(*)`)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null
  return { ...data, items: data.invoice_items ?? [] }
}

export async function getNextInvoiceNumber(userId: string): Promise<string> {
  const supabase = createClient()
  const year = new Date().getFullYear()

  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const next = (count ?? 0) + 1
  return `FAC-${year}-${String(next).padStart(4, '0')}`
}

export async function convertQuoteToInvoice(quote: Quote): Promise<Invoice> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('No autenticado')

  const invoiceNumber = await getNextInvoiceNumber(user.id)
  const issueDate = toISODate(new Date())
  const dueDate = toISODate(addDays(new Date(), 30))

  const invoiceData = {
    quote_id: quote.id,
    user_id: user.id,
    client_name: quote.client_name,
    client_email: quote.client_email,
    invoice_number: invoiceNumber,
    title: quote.title,
    description: quote.description,
    subtotal: quote.subtotal,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total,
    status: 'pending' as const,
    issue_date: issueDate,
    due_date: dueDate,
    notes: quote.notes,
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // Copiar items
  const itemsToInsert = quote.items.map(item => ({
    invoice_id: invoice.id,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
  }))

  if (itemsToInsert.length > 0) {
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)
    if (itemsError) throw itemsError
  }

  return { ...invoice, items: itemsToInsert as any }
}

export async function updateInvoiceStatus(
  id: string,
  status: Invoice['status']
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
