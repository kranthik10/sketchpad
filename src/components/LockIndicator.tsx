import { Lock } from 'lucide-react';
import type { CollaborationParticipant } from '../types/collaboration';

interface LockIndicatorProps {
  /** The participant who has locked this element */
  lockedBy: CollaborationParticipant;
  /** Position offset from the element (default: top-right) */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function LockIndicator({
  lockedBy,
  position = 'top-right',
}: LockIndicatorProps) {
  const positionStyles: Record<NonNullable<LockIndicatorProps['position']>, React.CSSProperties> = {
    'top-right': { top: -8, right: -8 },
    'top-left': { top: -8, left: -8 },
    'bottom-right': { bottom: -8, right: -8 },
    'bottom-left': { bottom: -8, left: -8 },
  };

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: lockedBy.color,
        color: '#ffffff',
        borderRadius: 12,
        padding: '2px 6px',
        fontSize: 10,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      title={`${lockedBy.name} is editing this element`}
    >
      <Lock size={10} strokeWidth={2.5} />
      <span>{lockedBy.name}</span>
    </div>
  );
}
