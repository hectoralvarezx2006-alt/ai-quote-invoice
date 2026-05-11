import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function generateInvoiceNumber(index: number): string {
  const year = new Date().getFullYear()
  const padded = String(index).padStart(4, '0')
  return `FAC-${year}-${padded}`
}

export function getQuoteStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviado',
    accepted: 'Aceptado',
    rejected: 'Rechazado',
  }
  return labels[status] ?? status
}

export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagada',
    overdue: 'Vencida',
    cancelled: 'Cancelada',
  }
  return labels[status] ?? status
}

export function getQuoteStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-surface-100 text-surface-600',
    sent: 'bg-blue-50 text-blue-700',
    accepted: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-red-50 text-red-700',
  }
  return colors[status] ?? 'bg-surface-100 text-surface-600'
}

export function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700',
    paid: 'bg-emerald-50 text-emerald-700',
    overdue: 'bg-red-50 text-red-700',
    cancelled: 'bg-surface-100 text-surface-600',
  }
  return colors[status] ?? 'bg-surface-100 text-surface-600'
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}
