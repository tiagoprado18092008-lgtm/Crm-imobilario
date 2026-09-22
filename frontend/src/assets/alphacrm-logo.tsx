/**
 * AlphaCRM mark.
 *
 * An "A" built from two strokes, with a connecting node where they meet and a
 * second on the crossbar — the swoosh-and-nodes idea from the AlphaScale
 * brand. Navy carries the letter; the cyan nodes are the only bright element,
 * which is the same restraint the interface uses.
 *
 * It replaces a house outline left over from the real-estate product. A house
 * on the login screen of a marketing agency's CRM undoes the rename before
 * anyone reads a word.
 */

const NAVY = '#143253'
const CYAN = '#00CDFF'

export const AlphaCrmLogo = ({ size = 32 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="AlphaCRM"
  >
    {/* Left leg of the A */}
    <path
      d="M38 168 L100 36"
      stroke={NAVY}
      strokeWidth="18"
      strokeLinecap="round"
    />
    {/* Right leg */}
    <path
      d="M100 36 L162 168"
      stroke={NAVY}
      strokeWidth="18"
      strokeLinecap="round"
    />
    {/* Crossbar, shortened so the nodes sit on its ends rather than past them */}
    <path
      d="M70 120 L130 120"
      stroke={NAVY}
      strokeWidth="16"
      strokeLinecap="round"
    />

    {/* Nodes: the apex, and one end of the crossbar. Two is enough — a third
        turns a mark into a diagram. */}
    <circle cx="100" cy="36" r="15" fill={CYAN} />
    <circle cx="130" cy="120" r="11" fill={CYAN} />
  </svg>
)

export const AlphaCrmWordmark = ({ height = 28 }: { height?: number }) => (
  <span
    style={{
      fontFamily: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif",
      fontSize: height,
      letterSpacing: '-0.025em',
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'baseline',
      userSelect: 'none',
    }}
  >
    {/* Weight carries the split, not colour: two colours in a four-syllable
        wordmark reads as decoration. */}
    <span style={{ color: NAVY, fontWeight: 800 }}>Alpha</span>
    <span style={{ color: NAVY, fontWeight: 400 }}>CRM</span>
  </span>
)
