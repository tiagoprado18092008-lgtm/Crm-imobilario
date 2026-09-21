#!/usr/bin/env node
/**
 * Checks the design tokens against WCAG 2.1 AA.
 *
 * Reads the values straight out of index.css so the check cannot drift from
 * what ships. Text is measured against the paper ground (#F4F8FC) as well as
 * white, because paper is the darker of the two and is what most text in the
 * app actually sits on — judging by white alone passes colours that fail in
 * place.
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'src', 'index.css'), 'utf8')

const token = (name) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!m) throw new Error(`Token --${name} not found in index.css`)
  return m[1]
}

const luminance = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

const ratio = (a, b) => {
  const [la, lb] = [luminance(a), luminance(b)]
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const WHITE = '#FFFFFF'
const PAPER = token('surface-2')
const NAVY = token('sidebar-bg')

// Text tokens must clear 4.5:1 on both grounds they appear on.
const TEXT = ['text-primary', 'text-secondary', 'text-muted', 'accent', 'success', 'warning', 'danger']

const failures = []
let checked = 0

for (const name of TEXT) {
  const hex = token(name)
  for (const [groundName, ground] of [['white', WHITE], ['paper', PAPER]]) {
    checked++
    const r = ratio(hex, ground)
    const line = `${name} (${hex}) on ${groundName}: ${r.toFixed(2)}:1`
    if (r < 4.5) failures.push(`  ${line}  — needs 4.5:1`)
    else console.log(`  pass  ${line}`)
  }
}

// Sidebar text sits on navy.
{
  checked++
  const hex = token('sidebar-text')
  const r = ratio(hex, NAVY)
  const line = `sidebar-text (${hex}) on sidebar-bg: ${r.toFixed(2)}:1`
  if (r < 4.5) failures.push(`  ${line}  — needs 4.5:1`)
  else console.log(`  pass  ${line}`)
}

// --accent-bright and --border are deliberately exempt: the first is a fill
// and the second a separator, and neither ever carries text.

if (failures.length) {
  console.error(`\n${failures.length} of ${checked} contrast checks failed:\n`)
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`\nAll ${checked} contrast checks pass (WCAG 2.1 AA).`)
