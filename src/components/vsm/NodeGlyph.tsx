import type { NodeKind } from '../../types'

/**
 * Standard VSM iconography rendered as pure SVG, centred on (0,0) in a
 * 116×84 box, drawn with currentColor so selection/alert states re-tint it.
 */
export function NodeGlyph({ kind }: { kind: NodeKind }) {
  switch (kind) {
    case 'process':
      return (
        <g>
          <rect x={-52} y={-34} width={104} height={68} rx={4} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <line x1={-52} y1={-18} x2={52} y2={-18} stroke="currentColor" strokeWidth={1} opacity={0.6} />
        </g>
      )
    case 'qcGate':
      return (
        <g>
          <rect x={-52} y={-34} width={104} height={68} rx={4} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <line x1={-52} y1={-18} x2={52} y2={-18} stroke="currentColor" strokeWidth={1} opacity={0.6} />
          <path d="M 36 18 l 6 6 l 10 -12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
        </g>
      )
    case 'rework':
      return (
        <g>
          <rect x={-52} y={-34} width={104} height={68} rx={4} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <path d="M 30 14 a 12 12 0 1 1 -4 14" fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M 24 30 l 2 -6 l 6 3 z" fill="currentColor" />
        </g>
      )
    case 'inventory':
    case 'safetyStock':
      return (
        <g>
          <path d="M 0 -30 L 34 28 L -34 28 Z" fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
          <text x={0} y={14} textAnchor="middle" fill="currentColor" fontSize={14} fontFamily="JetBrains Mono, monospace">I</text>
          {kind === 'safetyStock' ? (
            <path d="M -34 34 H 34" stroke="currentColor" strokeWidth={2} strokeDasharray="4 3" />
          ) : null}
        </g>
      )
    case 'supermarket':
      return (
        <g>
          {[-18, 0, 18].map((y) => (
            <path key={y} d={`M 36 ${y - 8} H -28 V ${y + 6}`} fill="none" stroke="currentColor" strokeWidth={1.6} />
          ))}
        </g>
      )
    case 'fifo':
      return (
        <g>
          <path d="M -48 -14 H 48 M -48 16 H 48" stroke="currentColor" strokeWidth={1.5} />
          <text x={0} y={6} textAnchor="middle" fill="currentColor" fontSize={11} fontFamily="JetBrains Mono, monospace" letterSpacing={2}>
            FIFO →
          </text>
        </g>
      )
    case 'supplier':
    case 'customer':
      return (
        <g>
          <path
            d="M -46 28 V -10 L -23 -26 V -10 L 0 -26 V -10 L 23 -26 V -10 L 46 -26 V 28 Z"
            fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"
          />
        </g>
      )
    case 'truck':
      return (
        <g>
          <rect x={-46} y={-22} width={64} height={38} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <path d="M 18 -10 h 20 l 10 12 v 14 h -30 z" fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <circle cx={-26} cy={22} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
          <circle cx={30} cy={22} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </g>
      )
    case 'ship':
      return (
        <g>
          <path d="M -44 6 H 44 L 30 26 H -30 Z" fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <rect x={-22} y={-12} width={14} height={18} fill="none" stroke="currentColor" strokeWidth={1.4} />
          <rect x={-6} y={-12} width={14} height={18} fill="none" stroke="currentColor" strokeWidth={1.4} />
          <rect x={10} y={-12} width={14} height={18} fill="none" stroke="currentColor" strokeWidth={1.4} />
        </g>
      )
    case 'air':
      return (
        <g>
          <path
            d="M -6 -26 l 8 0 l 6 18 l 24 4 l 0 8 l -24 0 l -6 18 l -8 0 l 2 -18 l -22 -2 l -8 8 l -6 0 l 4 -12 l -4 -12 l 6 0 l 8 8 l 22 -2 z"
            fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round"
          />
        </g>
      )
    case 'forklift':
      return (
        <g>
          <rect x={-30} y={-16} width={34} height={30} rx={3} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <path d="M 4 14 V -22 M 4 10 H 30" fill="none" stroke="currentColor" strokeWidth={2} />
          <circle cx={-20} cy={20} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
          <circle cx={-2} cy={20} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </g>
      )
    case 'operator':
      return (
        <g>
          <circle cx={0} cy={-14} r={10} fill="none" stroke="currentColor" strokeWidth={1.8} />
          <path d="M -18 24 a 18 18 0 0 1 36 0" fill="none" stroke="currentColor" strokeWidth={1.8} />
        </g>
      )
    case 'scrapBin':
      return (
        <g>
          <path d="M -28 -16 H 28 L 20 26 H -20 Z" fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <path d="M -10 -6 l 20 20 M 10 -6 l -20 20" stroke="currentColor" strokeWidth={1.8} />
        </g>
      )
    case 'kanbanPost':
      return (
        <g>
          <line x1={0} y1={-28} x2={0} y2={26} stroke="currentColor" strokeWidth={2} />
          <rect x={-2} y={-26} width={26} height={16} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <rect x={-2} y={-4} width={26} height={16} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
        </g>
      )
    case 'kanbanProduction':
      return (
        <g>
          <rect x={-26} y={-20} width={52} height={36} rx={2} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <path d="M -26 -20 L -14 -32 H 38 L 26 -20" fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.7} />
          <text x={0} y={2} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="JetBrains Mono, monospace">K-PROD</text>
        </g>
      )
    case 'kanbanWithdrawal':
      return (
        <g>
          <rect x={-26} y={-20} width={52} height={36} rx={2} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <text x={0} y={2} textAnchor="middle" fill="currentColor" fontSize={9} fontFamily="JetBrains Mono, monospace">K-WDRW</text>
        </g>
      )
    case 'heijunka':
      return (
        <g>
          <rect x={-40} y={-20} width={80} height={36} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          {[-20, 0, 20].map((x) => (
            <line key={x} x1={x} y1={-20} x2={x} y2={16} stroke="currentColor" strokeWidth={1} opacity={0.7} />
          ))}
          <line x1={-40} y1={-2} x2={40} y2={-2} stroke="currentColor" strokeWidth={1} opacity={0.7} />
          <text x={0} y={32} textAnchor="middle" fill="currentColor" fontSize={8} fontFamily="JetBrains Mono, monospace">HEIJUNKA</text>
        </g>
      )
    case 'productionControl':
    case 'erp':
      return (
        <g>
          <rect x={-50} y={-28} width={100} height={56} rx={3} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          {kind === 'erp' ? (
            <g stroke="currentColor" strokeWidth={1.2} fill="none" opacity={0.75}>
              <ellipse cx={32} cy={-14} rx={10} ry={4} />
              <path d="M 22 -14 V 0 a 10 4 0 0 0 20 0 V -14" />
            </g>
          ) : null}
        </g>
      )
    case 'schedule':
      return (
        <g>
          <rect x={-30} y={-28} width={60} height={56} rx={2} fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          {[-14, -4, 6, 16].map((y) => (
            <line key={y} x1={-20} y1={y} x2={20} y2={y} stroke="currentColor" strokeWidth={1.2} opacity={0.7} />
          ))}
        </g>
      )
    case 'goSee':
      return (
        <g>
          <path d="M -24 0 a 24 14 0 0 1 48 0 a 24 14 0 0 1 -48 0" fill="#0B0F19" stroke="currentColor" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={7} fill="none" stroke="currentColor" strokeWidth={1.6} />
        </g>
      )
  }
}
