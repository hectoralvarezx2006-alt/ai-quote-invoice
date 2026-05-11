import { createClient } from '@/lib/supabase/client'
import type { Quote, QuoteItem, AIQuoteResponse } from '@/types'

export async function getQuotes(): Promise<Quote[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select(`*, quote_items(*)`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(q => ({
    ...q,
    items: q.quote_items ?? [],
  }))
}

export async function getQuote(id: string): Promise<Quote | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('quotes')
    .select(`*, quote_items(*)`)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) return null
  return { ...data, items: data.quote_items ?? [] }
}

export async function createQuote(
  quoteData: Omit<Quote, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'items'>,
  items: Omit<QuoteItem, 'id' | 'quote_id'>[]
): Promise<Quote> {
  const supabase = createClient()

  // Obtener user_id explícitamente
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('No autenticado')

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({ ...quoteData, user_id: user.id })
    .select()
    .single()

  if (quoteError) throw quoteError

  const itemsToInsert = items.map(item => ({
    ...item,
    quote_id: quote.id,
    subtotal: item.price * (item.quantity ?? 1),
  }))

  const { error: itemsError } = await supabase
    .from('quote_items')
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  return { ...quote, items: itemsToInsert as QuoteItem[] }
}

export async function updateQuote(
  id: string,
  quoteData: Partial<Omit<Quote, 'id' | 'user_id' | 'created_at' | 'items'>>,
  items?: Omit<QuoteItem, 'id' | 'quote_id'>[]
): Promise<void> {
  const supabase = createClient()

  const { error: quoteError } = await supabase
    .from('quotes')
    .update({ ...quoteData, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (quoteError) throw quoteError

  if (items !== undefined) {
    // Eliminar items existentes y reinsertar
    await supabase.from('quote_items').delete().eq('quote_id', id)

    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        ...item,
        quote_id: id,
        subtotal: item.price * (item.quantity ?? 1),
      }))
      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert)
      if (itemsError) throw itemsError
    }
  }
}

export async function deleteQuote(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('quotes').delete().eq('id', id)
  if (error) throw error
}

export async function updateQuoteStatus(
  id: string,
  status: Quote['status']
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export function aiResponseToQuoteData(
  ai: AIQuoteResponse,
  clientName: string,
  clientEmail?: string,
  taxRate = 21
) {
  const subtotal = ai.items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const quoteData = {
    client_name: clientName,
    client_email: clientEmail ?? null,
    title: ai.title,
    description: ai.description,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total,
    status: 'draft' as const,
    notes: ai.notes ?? null,
    valid_until: null,
    client_id: null,
  }

  const items: Omit<QuoteItem, 'id' | 'quote_id'>[] = ai.items.map(item => ({
    name: item.name,
    description: item.description,
    quantity: item.quantity ?? 1,
    price: item.price,
    subtotal: item.price * (item.quantity ?? 1),
  }))

  return { quoteData, items }
}
