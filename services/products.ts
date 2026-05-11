import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types'

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createProduct(
  product: Omit<Product, 'id' | 'user_id' | 'created_at'>
): Promise<Product> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
  if (error) throw error
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function toggleProduct(id: string, active: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)
  if (error) throw error
}