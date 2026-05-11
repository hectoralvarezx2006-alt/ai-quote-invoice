import type { Quote, Invoice, UserProfile } from '@/types'
import { formatCurrency, formatDateShort } from '@/lib/utils'

async function getJsPDF() {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  return jsPDF
}

interface PDFOptions {
  document: Quote | Invoice
  profile: UserProfile | null
  type: 'quote' | 'invoice'
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [59, 110, 246]
  return [r, g, b]
}

function lightenColor(rgb: [number, number, number], amount = 0.92): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * amount),
    Math.round(rgb[1] + (255 - rgb[1]) * amount),
    Math.round(rgb[2] + (255 - rgb[2]) * amount),
  ]
}

export async function generatePDF({ document, profile, type }: PDFOptions): Promise<void> {
  const jsPDF = await getJsPDF()
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }) as any

  const pageW = 210
  const pageH = 297
  const marginL = 18
  const marginR = 18
  const contentW = pageW - marginL - marginR

  const brandHex = (profile as any)?.brand_color ?? '#3b6ef6'
  const colorBrand = hexToRgb(brandHex)
  const colorBrandLight = lightenColor(colorBrand)
  const colorDark: [number, number, number] = [22, 31, 58]
  const colorMuted: [number, number, number] = [100, 110, 140]
  const colorLight: [number, number, number] = [240, 242, 248]
  const colorWhite: [number, number, number] = [255, 255, 255]
  const colorBorder: [number, number, number] = [220, 224, 235]

  const setFont = (style: 'normal' | 'bold', size: number, color: [number, number, number]) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }

  // HEADER
  doc.setFillColor(...colorBrand)
  doc.rect(0, 0, pageW, 48, 'F')

  const companyName = profile?.company_name ?? 'Mi Empresa'
  setFont('bold', 22, colorWhite)
  doc.text(companyName, marginL, 22)

  if (profile?.nif) {
    setFont('normal', 8, [180, 200, 255])
    doc.text(`NIF: ${profile.nif}`, marginL, 30)
  }

  const docLabel = type === 'invoice' ? 'FACTURA' : 'PRESUPUESTO'
  setFont('bold', 26, colorWhite)
  doc.text(docLabel, pageW - marginR, 22, { align: 'right' })

  const docNumber = type === 'invoice'
    ? (document as Invoice).invoice_number
    : `PRE-${document.id.slice(0, 8).toUpperCase()}`

  setFont('normal', 9, [180, 200, 255])
  doc.text(docNumber, pageW - marginR, 31, { align: 'right' })

  // DATOS: 3 columnas bien separadas sin solapamiento
  // Col1: DE  |  Col2: PARA  |  Col3: FECHAS
  const col1X = marginL
  const col2X = 80
  const col3X = 155
  const colW1 = col2X - col1X - 4
  const colW2 = col3X - col2X - 4

  let sectionY = 60

  setFont('bold', 7, colorMuted)
  doc.text('DE', col1X, sectionY)
  doc.text('PARA', col2X, sectionY)
  doc.text('FECHAS', col3X, sectionY)

  sectionY += 5

  // Columna 1: Emisor
  let y1 = sectionY
  setFont('bold', 10, colorDark)
  const nameLines1 = doc.splitTextToSize(companyName, colW1)
  doc.text(nameLines1, col1X, y1)
  y1 += nameLines1.length * 5

  setFont('normal', 8, colorMuted)
  const emisorFields = [
    profile?.email,
    profile?.phone,
    profile?.address,
    profile?.city,
    (profile as any)?.website,
  ].filter(Boolean) as string[]

  emisorFields.forEach(field => {
    const lines = doc.splitTextToSize(field, colW1)
    doc.text(lines, col1X, y1)
    y1 += lines.length * 4.5
  })

  // Columna 2: Cliente
  let y2 = sectionY
  setFont('bold', 10, colorDark)
  const nameLines2 = doc.splitTextToSize(document.client_name, colW2)
  doc.text(nameLines2, col2X, y2)
  y2 += nameLines2.length * 5

  setFont('normal', 8, colorMuted)
  if (document.client_email) {
    const emailLines = doc.splitTextToSize(document.client_email, colW2)
    doc.text(emailLines, col2X, y2)
    y2 += emailLines.length * 4.5
  }

  // Columna 3: Fechas (posición fija, sin conflicto)
  let y3 = sectionY
  const dateFields = type === 'invoice'
    ? [
        { label: 'EMISIÓN', value: formatDateShort((document as Invoice).issue_date) },
        { label: 'VENCIMIENTO', value: formatDateShort((document as Invoice).due_date) },
      ]
    : [
        { label: 'FECHA', value: formatDateShort(document.created_at) },
      ]

  dateFields.forEach(({ label, value }) => {
    setFont('bold', 7, colorMuted)
    doc.text(label, col3X, y3)
    y3 += 4
    setFont('bold', 9, colorDark)
    doc.text(value, col3X, y3)
    y3 += 8
  })

  // Línea divisora
  const afterSection = Math.max(y1, y2, y3) + 8
  doc.setDrawColor(...colorBorder)
  doc.setLineWidth(0.3)
  doc.line(marginL, afterSection, pageW - marginR, afterSection)

  let y = afterSection + 8

  // TÍTULO
  doc.setFillColor(...colorBrandLight)
  doc.roundedRect(marginL, y, contentW, 12, 2, 2, 'F')
  setFont('bold', 11, colorDark)
  doc.text(document.title, marginL + 5, y + 8)
  y += 18

  // Descripción
  if (document.description) {
    setFont('normal', 8.5, colorMuted)
    const descLines = doc.splitTextToSize(document.description, contentW)
    doc.text(descLines, marginL, y)
    y += descLines.length * 5 + 6
  }

  // TABLA ITEMS
  const tableHead = [['Concepto', 'Descripción', 'Cant.', 'Precio unit.', 'Subtotal']]
  const tableBody = document.items.map(item => [
    item.name,
    item.description ?? '',
    String(item.quantity),
    formatCurrency(item.price),
    formatCurrency(item.price * item.quantity),
  ])

  doc.autoTable({
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: marginL, right: marginR },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor: colorDark,
      lineColor: colorBorder,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: colorBrand,
      textColor: colorWhite,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: colorLight },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 36 },
      1: { cellWidth: 62, textColor: colorMuted },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
  })

  y = (doc as any).lastAutoTable.finalY + 10

  // TOTALES
  const totalsBoxX = pageW - marginR - 72
  const totalsBoxW = 72

  doc.setFillColor(...colorLight)
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 34, 2, 2, 'F')

  setFont('normal', 8.5, colorMuted)
  doc.text('Base imponible', totalsBoxX + 4, y + 9)
  setFont('normal', 8.5, colorDark)
  doc.text(formatCurrency(document.subtotal), totalsBoxX + totalsBoxW - 4, y + 9, { align: 'right' })

  setFont('normal', 8.5, colorMuted)
  doc.text(`IVA (${document.tax_rate}%)`, totalsBoxX + 4, y + 18)
  setFont('normal', 8.5, colorDark)
  doc.text(formatCurrency(document.tax_amount), totalsBoxX + totalsBoxW - 4, y + 18, { align: 'right' })

  doc.setDrawColor(...colorBorder)
  doc.setLineWidth(0.3)
  doc.line(totalsBoxX + 4, y + 22, totalsBoxX + totalsBoxW - 4, y + 22)

  doc.setFillColor(...colorBrand)
  doc.roundedRect(totalsBoxX, y + 24, totalsBoxW, 14, 2, 2, 'F')
  setFont('bold', 11, colorWhite)
  doc.text('TOTAL', totalsBoxX + 5, y + 33)
  doc.text(formatCurrency(document.total), totalsBoxX + totalsBoxW - 5, y + 33, { align: 'right' })

  y += 52

  // NOTAS
  if (document.notes) {
    const noteLines = doc.splitTextToSize(document.notes, contentW - 12)
    const noteH = noteLines.length * 5 + 14

    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(253, 230, 138)
    doc.setLineWidth(0.3)
    doc.roundedRect(marginL, y, contentW, noteH, 2, 2, 'FD')

    setFont('bold', 7.5, [146, 100, 10])
    doc.text('NOTAS', marginL + 5, y + 7)
    setFont('normal', 8, colorDark)
    doc.text(noteLines, marginL + 5, y + 13)
    y += noteH + 8
  }

  // IBAN (solo en facturas)
  const iban = (profile as any)?.iban
  if (iban && type === 'invoice') {
    doc.setFillColor(...colorBrandLight)
    doc.roundedRect(marginL, y, contentW, 14, 2, 2, 'F')
    setFont('bold', 7.5, colorMuted)
    doc.text('DATOS DE PAGO', marginL + 5, y + 6)
    setFont('normal', 8.5, colorDark)
    doc.text(`IBAN: ${iban}`, marginL + 5, y + 12)
    y += 20
  }

  // FOOTER
  doc.setFillColor(...colorLight)
  doc.rect(0, pageH - 12, pageW, 12, 'F')
  setFont('normal', 7, colorMuted)
  doc.text(companyName, marginL, pageH - 4)
  doc.text(docNumber, pageW / 2, pageH - 4, { align: 'center' })
  doc.text(new Date().toLocaleDateString('es-ES'), pageW - marginR, pageH - 4, { align: 'right' })

  const fileName = type === 'invoice'
    ? `${(document as Invoice).invoice_number}.pdf`
    : `Presupuesto-${document.id.slice(0, 8)}.pdf`

  doc.save(fileName)
}
