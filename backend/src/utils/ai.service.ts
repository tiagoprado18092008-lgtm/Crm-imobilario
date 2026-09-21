import prisma from '../config/database';

interface QualificationData {
  budget?: number
  /** Serviço em que a lead demonstrou interesse */
  service?: 'WEBSITE' | 'ADS' | 'REDES_SOCIAIS' | 'SEO'
  /** Setor da clínica/empresa */
  sector?: string
  location?: string
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH'
  notes?: string
}

// Extrai dados de qualificação de uma mensagem usando regras + OpenAI (se configurado)
export async function qualifyLeadFromMessage(
  message: string,
  contactId: string
): Promise<QualificationData> {
  let data: QualificationData = {}

  // Se OpenAI estiver configurado, usa IA
  if (process.env.OPENAI_API_KEY) {
    try {
      data = await qualifyWithOpenAI(message)
    } catch (err) {
      console.error('[AI] OpenAI error, falling back to rules:', err)
      data = qualifyWithRules(message)
    }
  } else {
    // Fallback: extração por regras simples
    data = qualifyWithRules(message)
  }

  // Atualiza o contacto com os dados extraídos
  if (Object.keys(data).length > 0) {
    try {
      const contact = await prisma.contact.findUnique({ where: { id: contactId } })
      if (contact) {
        const existingPrefs = contact.preferences ? JSON.parse(contact.preferences) : {}
        const updated = { ...existingPrefs, ...data, lastQualifiedAt: new Date().toISOString() }
        await prisma.contact.update({
          where: { id: contactId },
          data: { preferences: JSON.stringify(updated) }
        })
      }
    } catch (err) {
      console.error('[AI] Error updating contact:', err)
    }
  }

  return data
}

// Qualificação com OpenAI
async function qualifyWithOpenAI(message: string): Promise<QualificationData> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extrai dados de qualificação B2B de uma agência de marketing digital. Responde APENAS em JSON com os campos: budget (número em euros), service (WEBSITE/ADS/REDES_SOCIAIS/SEO), sector (setor da empresa, ex: fisioterapia, dentária, veterinária), location (string), urgency (LOW/MEDIUM/HIGH). Omite campos que não consigues determinar.`
        },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    }),
  })

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`)
  const result = await response.json() as any
  return JSON.parse(result.choices[0].message.content)
}

// Qualificação por regras simples (sem IA)
function qualifyWithRules(message: string): QualificationData {
  const data: QualificationData = {}
  const lower = message.toLowerCase()

  // Orçamento
  const budgetMatch = message.match(/(\d+)[k\s]*(euros?|€|mil)/i)
  if (budgetMatch) {
    const val = parseInt(budgetMatch[1])
    data.budget = lower.includes('mil') || lower.includes('k') ? val * 1000 : val
  }

  // Serviço pretendido
  if (lower.includes('site') || lower.includes('website') || lower.includes('página')) data.service = 'WEBSITE'
  if (lower.includes('google ads') || lower.includes('anúncio') || lower.includes('campanha') || lower.includes('meta ads')) data.service = 'ADS'
  if (lower.includes('instagram') || lower.includes('facebook') || lower.includes('redes sociais')) data.service = 'REDES_SOCIAIS'
  if (lower.includes('seo') || lower.includes('google')) data.service = 'SEO'

  // Setor da clínica
  if (lower.includes('fisioterapia')) data.sector = 'fisioterapia'
  if (lower.includes('dentária') || lower.includes('dentista')) data.sector = 'dentária'
  if (lower.includes('veterinár')) data.sector = 'veterinária'
  if (lower.includes('estética')) data.sector = 'medicina estética'

  // Urgência
  if (lower.includes('urgent') || lower.includes('já') || lower.includes('imediato') || lower.includes('esta semana')) {
    data.urgency = 'HIGH'
  } else if (lower.includes('mês') || lower.includes('breve') || lower.includes('pronto')) {
    data.urgency = 'MEDIUM'
  }

  return data
}
