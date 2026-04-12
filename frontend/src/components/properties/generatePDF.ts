import jsPDF from 'jspdf'
import type { Property } from '../../types'
import { PROPERTY_TYPE_LABELS, PROPERTY_STATUS_LABELS } from '../../utils/constants'

export const generatePropertyPDF = async (property: Property, apiBase: string) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, margin = 15

  // Título
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(property.title, margin, 25)

  // Tipo e estado
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`${PROPERTY_TYPE_LABELS[property.type]} · ${PROPERTY_STATUS_LABELS[property.status]}`, margin, 33)
  if (property.reference) doc.text(`Ref: ${property.reference}`, margin, 39)

  // Preço
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 200, 80)
  doc.text(
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(property.price),
    W - margin,
    25,
    { align: 'right' }
  )
  doc.setTextColor(0)

  let y = 50

  // Foto de capa
  if (property.photos && property.photos.length > 0) {
    try {
      const photoUrl = property.photos[0].url.startsWith('http')
        ? property.photos[0].url
        : `${apiBase}${property.photos[0].url}`
      const img = await loadImage(photoUrl)
      const imgW = W - margin * 2
      const imgH = Math.min(imgW * 0.6, 90)
      doc.addImage(img, 'JPEG', margin, y, imgW, imgH)
      y += imgH + 8
    } catch { /* sem foto */ }
  }

  // Características
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60)
  const chars: string[] = []
  if (property.area) chars.push(`Área: ${property.area} m²`)
  if (property.bedrooms != null) chars.push(`Quartos: ${property.bedrooms}`)
  if (property.bathrooms != null) chars.push(`WC: ${property.bathrooms}`)
  if (property.parking != null) chars.push(`Estac.: ${property.parking}`)
  doc.text(chars.join('  ·  '), margin, y)
  y += 7

  // Endereço
  doc.text(property.address, margin, y)
  y += 10

  // Descrição
  if (property.description) {
    doc.setFontSize(9)
    doc.setTextColor(80)
    const lines = doc.splitTextToSize(property.description, W - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 8
  }

  // Rodapé
  doc.setFontSize(9)
  doc.setTextColor(140)
  doc.text('CasaFlow CRM · ' + new Date().toLocaleDateString('pt-PT'), margin, 285)

  const ref = property.reference || property.id.slice(0, 8)
  doc.save(`ficha-${ref}.pdf`)
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}
