import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ALL_PIECE_TYPES, pieceImagePath, square } from '../chess-game';
import type { Color } from '../chess-game';

const PREVIEW_SQ = square(0, 0);
const base = import.meta.env.BASE_URL;

/** Must match `--dancing-pad` / `--dancing-rail` in `index.css` */
const DANCER_PAD_REM = 0.35;
const DANCER_RAIL_REM = 1.1;

/** Match `@media (max-width: 639px)` — no side rails, top/bottom use full width */
const NARROW_MAX_W = 639;

const PITCH_PX = 21;

function remPx(rem: number): number {
  if (typeof document === 'undefined') return rem * 16;
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * fs;
}

function pieceSrc(i: number): string {
  const type = ALL_PIECE_TYPES[i % ALL_PIECE_TYPES.length];
  const color: Color = i % 2 === 0 ? 'w' : 'b';
  return `${base}${pieceImagePath({ color, type }, PREVIEW_SQ)}`;
}

function edgeSlotIndices(length: number, start: number): number[] {
  return Array.from({ length }, (_, j) => start + j);
}

function countsForSize(width: number, height: number, narrow: boolean) {
  const padPx = remPx(DANCER_PAD_REM);
  const railPx = remPx(DANCER_RAIL_REM);
  const vertUse = Math.max(0, height - 2 * padPx);
  const vert = Math.max(8, Math.min(160, Math.round(vertUse / PITCH_PX)));

  const horizSpan = narrow
    ? Math.max(0, width - 2 * padPx)
    : Math.max(0, width - 2 * padPx - 2 * railPx);
  const horiz = Math.max(4, Math.min(56, Math.round(horizSpan / PITCH_PX)));

  return { horiz, vert };
}

export type DancingPieceFrameProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Wraps content in a container whose border is animated chess pieces.
 * ResizeObserver on the wrapper keeps density even for any size.
 * Top/bottom rows sit between the side rails so corners are not doubled up.
 */
export function DancingPieceFrame({ className, children }: DancingPieceFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [{ horiz, vert }, setCounts] = useState(() => countsForSize(832, 2400, false));

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const update = () => {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w < 1 || h < 1) return;
      setCounts(countsForSize(w, h, w <= NARROW_MAX_W));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const top = edgeSlotIndices(horiz, 0);
  const right = edgeSlotIndices(vert, top[top.length - 1]! + 1);
  const bottom = edgeSlotIndices(horiz, right[right.length - 1]! + 1);
  const left = edgeSlotIndices(vert, bottom[bottom.length - 1]! + 1);

  const dancerStyle = {
    ['--piece-cols' as string]: String(horiz),
    ['--piece-rows' as string]: String(vert),
  } as CSSProperties;

  const rootClass = ['dancing-piece-frame', className].filter(Boolean).join(' ');

  return (
    <div ref={rootRef} className={rootClass}>
      <div className="dancing-piece-frame__dancers" aria-hidden style={dancerStyle}>
        <div className="dancing-piece-frame__edge dancing-piece-frame__edge--top">
          {top.map((i) => (
            <span key={`t-${i}`} className="dancing-piece-frame__piece" style={{ ['--d' as string]: String(i) }}>
              <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
            </span>
          ))}
        </div>
        <div className="dancing-piece-frame__edge dancing-piece-frame__edge--right">
          {right.map((i) => (
            <span key={`r-${i}`} className="dancing-piece-frame__piece" style={{ ['--d' as string]: String(i) }}>
              <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
            </span>
          ))}
        </div>
        <div className="dancing-piece-frame__edge dancing-piece-frame__edge--bottom">
          {[...bottom].reverse().map((i) => (
            <span key={`b-${i}`} className="dancing-piece-frame__piece" style={{ ['--d' as string]: String(i) }}>
              <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
            </span>
          ))}
        </div>
        <div className="dancing-piece-frame__edge dancing-piece-frame__edge--left">
          {[...left].reverse().map((i) => (
            <span key={`l-${i}`} className="dancing-piece-frame__piece" style={{ ['--d' as string]: String(i) }}>
              <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
            </span>
          ))}
        </div>
      </div>
      <div className="dancing-piece-frame__content">{children}</div>
    </div>
  );
}
