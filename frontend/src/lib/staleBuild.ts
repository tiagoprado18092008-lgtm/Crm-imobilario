/**
 * Each deploy replaces the hashed chunks under /assets. A tab opened before
 * the deploy still asks for the old names, the import fails, and the page
 * showed "Failed to fetch dynamically imported module". Loading the page again
 * picks up the new build, so do that instead of showing an error.
 */

const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \S+ failed|Unable to preload CSS/i

const RELOADED_AT_KEY = 'crm_stale_build_reload_at'

/** Enough to stop a reload loop if the new build is itself broken. */
const MIN_INTERVAL_MS = 20_000

export const isStaleChunkError = (error: unknown): boolean =>
  STALE_CHUNK.test(String((error as any)?.message ?? error ?? ''))

/** Reloads once; returns false if it already did so moments ago. */
export const reloadForNewBuild = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0)
    if (Date.now() - last < MIN_INTERVAL_MS) return false
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  } catch {
    // Storage unavailable: reload anyway, the interval guard is best effort.
  }
  window.location.reload()
  return true
}
