#!/usr/bin/env node
/**
 * Fails on Brazilian Portuguese in user-facing strings.
 *
 * The product is written in European Portuguese, and the drift is gradual:
 * one screen says "usuário", the next says "gerenciar", and six months later
 * the vocabulary is inconsistent across the app. Catching it per commit is
 * cheaper than a sweep later.
 *
 * Run: node scripts/check-pt-pt.mjs
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

/** pt-BR term → the European Portuguese the product uses. */
const BANNED = [
  [/\busuário(s)?\b/gi, 'utilizador(es)'],
  [/\barquivo(s)?\b/gi, 'ficheiro(s)'],
  [/\bgerenciar\b/gi, 'gerir'],
  [/\bgerencie\b/gi, 'gere'],
  [/\bgerenciamento\b/gi, 'gestão'],
  [/\bcelular(es)?\b/gi, 'telemóvel/telemóveis'],
  [/\btela(s)?\b/gi, 'ecrã(s)'],
  [/\bsenha(s)?\b/gi, 'palavra-passe'],
  [/\bcontato(s)?\b/gi, 'contacto(s)'],
  [/\btime(s) de\b/gi, 'equipa(s) de'],
  [/\bcadastro\b/gi, 'registo'],
  [/\bcadastrar\b/gi, 'registar'],
  [/\bendereço de e-?mail\b/gi, 'endereço de email'],
  // "você" is not wrong Portuguese, but the product addresses the reader
  // informally throughout; mixing registers reads as machine-translated.
  [/\bvocê\b/gi, 'tu (ou reformular sem pronome)'],
]

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules') continue
      walk(full, out)
    } else if (/\.(ts|tsx|json)$/.test(name)) {
      out.push(full)
    }
  }
  return out
}

const findings = []

for (const file of walk(ROOT)) {
  const src = readFileSync(file, 'utf8')
  const lines = src.split('\n')
  lines.forEach((line, i) => {
    // The glossary in pt-PT.json names the banned terms on purpose.
    if (line.includes('_comment') || line.includes('check-pt-pt')) return
    for (const [pattern, suggestion] of BANNED) {
      pattern.lastIndex = 0
      const m = pattern.exec(line)
      if (m) {
        findings.push(
          `  ${relative(ROOT, file).replace(/\\/g, '/')}:${i + 1}  "${m[0]}" → use ${suggestion}`,
        )
      }
    }
  })
}

if (findings.length) {
  console.error(`\n${findings.length} Brazilian Portuguese term(s) found:\n`)
  console.error(findings.join('\n'))
  console.error('\nThe product is written in European Portuguese.')
  process.exit(1)
}

console.log('No pt-BR terms found; wording is European Portuguese.')
