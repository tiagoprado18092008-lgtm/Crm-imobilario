import ptPT from './pt-PT.json'

/**
 * Strings for the product.
 *
 * Deliberately a plain lookup rather than a full i18n runtime: the product
 * ships in one locale and adding a second is not planned, so a library here
 * would buy indirection and a bundle cost without buying a translation.
 *
 * What the file does buy is a single place where the European Portuguese
 * vocabulary is fixed — equipa, utilizador, ficheiro, gerir, ecrã, telemóvel —
 * so pt-BR wording cannot drift in one screen at a time.
 *
 * Use it for shared vocabulary: navigation, entity names, actions, error and
 * empty states. A string that appears once, in one screen, is clearer inline.
 */

type Messages = typeof ptPT

/** Dot path into the message tree, e.g. `t('contacts.novo')`. */
export function t(path: string, vars?: Record<string, string | number>): string {
  const value = path
    .split('.')
    .reduce<any>((node, key) => (node == null ? undefined : node[key]), ptPT)

  if (typeof value !== 'string') {
    // Surfacing the path beats rendering "undefined" in the interface.
    if (import.meta.env.DEV) console.warn(`[i18n] Missing string: ${path}`)
    return path
  }

  if (!vars) return value
  return value.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

/** Picks singular or plural by count: `plural(3, 'contacts')` → "contactos". */
export function plural(count: number, key: string): string {
  return t(`${key}.${count === 1 ? 'singular' : 'plural'}`)
}

export const messages: Messages = ptPT
