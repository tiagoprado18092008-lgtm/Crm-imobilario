export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n)
}

export function formatDate(s: string): string {
  if (!s) return '-'
  try {
    const d = new Date(s)
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '-'
  }
}

export function formatDateTime(s: string): string {
  if (!s) return '-'
  try {
    const d = new Date(s)
    return d.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return '-'
  }
}

export function formatPhone(s: string): string {
  if (!s) return '-'
  const cleaned = s.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`
  }
  return s
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}
