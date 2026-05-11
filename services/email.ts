import { Resend } from 'resend'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { Quote, UserProfile } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)

// Email que aparece como remitente — en plan free de Resend DEBE ser
// un dominio verificado o usar onboarding@resend.dev para pruebas
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── 1. Enviar presupuesto al cliente ─────────────────────────
export async function sendQuoteToClient(
  quote: Quote,
  profile: UserProfile | null
): Promise<void> {
  const portalUrl = `${APP_URL}/p/${quote.public_token}`
  const companyName = profile?.company_name ?? 'Tu proveedor'
  const replyTo = profile?.email ?? undefined

  const html = buildQuoteEmail({ quote, companyName, portalUrl })

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: quote.client_email!,
    replyTo: replyTo,
    subject: `Presupuesto: ${quote.title} — ${formatCurrency(quote.total)}`,
    html,
  })

  if (error) throw new Error(`Error enviando email: ${error.message}`)
}

// ── 2. Notificar al emisor cuando el cliente responde ─────────
export async function sendResponseNotification(
  quote: Quote,
  profile: UserProfile | null,
  response: 'accepted' | 'rejected'
): Promise<void> {
  if (!profile?.email) return

  const companyName = profile?.company_name ?? 'Tu empresa'
  const emoji = response === 'accepted' ? '✅' : '❌'
  const label = response === 'accepted' ? 'ACEPTADO' : 'RECHAZADO'
  const color = response === 'accepted' ? '#16a34a' : '#dc2626'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'DM Sans', Arial, sans-serif; background: #f8f9fc; margin: 0; padding: 32px;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
    <div style="background: ${color}; padding: 28px 32px;">
      <p style="color: white; font-size: 28px; margin: 0;">${emoji}</p>
      <h1 style="color: white; font-size: 20px; margin: 8px 0 0;">Presupuesto ${label}</h1>
    </div>
    <div style="padding: 28px 32px;">
      <p style="color: #363d54; font-size: 15px; margin: 0 0 16px;">
        <strong>${quote.client_name}</strong> ha ${response === 'accepted' ? 'aceptado' : 'rechazado'} tu presupuesto.
      </p>
      <div style="background: #f0f2f7; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px; font-size: 13px; color: #6b7494;">Presupuesto</p>
        <p style="margin: 0; font-size: 15px; font-weight: 600; color: #131826;">${quote.title}</p>
        <p style="margin: 6px 0 0; font-size: 18px; font-weight: 700; color: ${color};">${formatCurrency(quote.total)}</p>
      </div>
      <a href="${APP_URL}/dashboard/quotes/${quote.id}"
        style="display: inline-block; background: #3b6ef6; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Ver en el dashboard →
      </a>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #e4e7f0;">
      <p style="color: #9ba3bc; font-size: 12px; margin: 0;">AI Quote & Invoice · ${companyName}</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: profile.email,
    subject: `${emoji} Presupuesto ${label}: ${quote.title}`,
    html,
  })

  if (error) console.error('Error enviando notificación:', error.message)
}

// ── Builder del email de presupuesto ─────────────────────────
function buildQuoteEmail({
  quote,
  companyName,
  portalUrl,
}: {
  quote: Quote
  companyName: string
  portalUrl: string
}): string {
  const itemsRows = quote.items.map(item => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f2f7; font-size: 13px; color: #131826; font-weight: 500;">${item.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f2f7; font-size: 13px; color: #6b7494; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f2f7; font-size: 13px; color: #131826; text-align: right;">${formatCurrency(item.price)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f2f7; font-size: 13px; color: #131826; font-weight: 600; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family: Arial, sans-serif; background: #f8f9fc; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background: #3b6ef6; padding: 32px;">
      <h1 style="color: white; margin: 0; font-size: 14px; font-weight: 500; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">${companyName}</h1>
      <h2 style="color: white; margin: 8px 0 0; font-size: 24px;">Presupuesto para ti</h2>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="color: #363d54; font-size: 15px; margin: 0 0 8px;">Hola, <strong>${quote.client_name}</strong> 👋</p>
      <p style="color: #6b7494; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
        Te enviamos el presupuesto <strong>${quote.title}</strong>. 
        Puedes verlo en detalle y aceptarlo o rechazarlo directamente desde el botón de abajo.
      </p>

      <!-- Título presupuesto -->
      <div style="background: #f0f2f7; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #9ba3bc; text-transform: uppercase; letter-spacing: 0.5px;">Proyecto</p>
        <p style="margin: 0; font-size: 16px; font-weight: 700; color: #131826;">${quote.title}</p>
        ${quote.description ? `<p style="margin: 6px 0 0; font-size: 13px; color: #6b7494;">${quote.description}</p>` : ''}
      </div>

      <!-- Tabla items -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f8f9fc;">
            <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #9ba3bc; text-transform: uppercase; font-weight: 600;">Concepto</th>
            <th style="padding: 10px 12px; text-align: center; font-size: 11px; color: #9ba3bc; text-transform: uppercase; font-weight: 600;">Cant.</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #9ba3bc; text-transform: uppercase; font-weight: 600;">Precio</th>
            <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #9ba3bc; text-transform: uppercase; font-weight: 600;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <!-- Totales -->
      <div style="background: #f8f9fc; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 13px; color: #6b7494;">Base imponible</span>
          <span style="font-size: 13px; color: #363d54;">${formatCurrency(quote.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="font-size: 13px; color: #6b7494;">IVA (${quote.tax_rate}%)</span>
          <span style="font-size: 13px; color: #363d54;">${formatCurrency(quote.tax_amount)}</span>
        </div>
        <div style="border-top: 1px solid #e4e7f0; padding-top: 10px; display: flex; justify-content: space-between;">
          <span style="font-size: 16px; font-weight: 700; color: #131826;">TOTAL</span>
          <span style="font-size: 20px; font-weight: 700; color: #3b6ef6;">${formatCurrency(quote.total)}</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <a href="${portalUrl}"
          style="display: inline-block; background: #3b6ef6; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(59,110,246,0.3);">
          Ver presupuesto completo →
        </a>
        <p style="color: #9ba3bc; font-size: 12px; margin: 12px 0 0;">
          O copia este enlace: <a href="${portalUrl}" style="color: #3b6ef6;">${portalUrl}</a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 32px; border-top: 1px solid #e4e7f0; background: #f8f9fc;">
      <p style="color: #9ba3bc; font-size: 12px; margin: 0;">
        Este presupuesto fue generado por <strong>${companyName}</strong> usando AI Quote & Invoice.
        ${quote.valid_until ? `Válido hasta el ${formatDateShort(quote.valid_until)}.` : ''}
      </p>
    </div>
  </div>
</body>
</html>`
}
