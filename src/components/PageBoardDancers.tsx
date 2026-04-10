import { useLayoutEffect, useRef, useState } from 'react';
import { ALL_PIECE_TYPES, pieceImagePath, square } from '../chess-game';
import type { Color } from '../chess-game';

const PREVIEW_SQ = square(0, 0);
const base = import.meta.env.BASE_URL;

/** Must match `left` / `top` / `bottom` / `right` on `.page--board__dancers-edge` in index.css */
const DANCER_INSET_REM = 0.35;

function insetPx(): number {
  if (typeof document === 'undefined') return 5.6;
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return DANCER_INSET_REM * fs;
}

/** Target center-to-center pitch (px) so horizontal & vertical edges feel the same density */
const PITCH_PX = 21;

function pieceSrc(i: number): string {
  const type = ALL_PIECE_TYPES[i % ALL_PIECE_TYPES.length];
  const color: Color = i % 2 === 0 ? 'w' : 'b';
  return `${base}${pieceImagePath({ color, type }, PREVIEW_SQ)}`;
}

function edgeSlotIndices(length: number, start: number): number[] {
  return Array.from({ length }, (_, j) => start + j);
}

function countsForSize(width: number, height: number, padPx: number) {
  const horizUse = Math.max(0, width - 2 * padPx);
  const vertUse = Math.max(0, height - 2 * padPx);
  const horiz = Math.max(8, Math.min(56, Math.round(horizUse / PITCH_PX)));
  const vert = Math.max(8, Math.min(160, Math.round(vertUse / PITCH_PX)));
  return { horiz, vert };
}

/** Decorative perimeter on `.page--board` — cycles piece types, alternates colors. */
export function PageBoardDancers() {
  const hostRef = useRef<HTMLDivElement>(null);
  const pad = insetPx();
  const [{ horiz, vert }, setCounts] = useState(() => countsForSize(832, 2400, pad));

  useLayoutEffect(() => {
    const dancersEl = hostRef.current;
    const board = dancersEl?.parentElement;
    if (!board) return;

    const update = () => {
      const p = insetPx();
      const w = board.clientWidth;
      const h = board.clientHeight;
      if (w < 1 || h < 1) return;
      setCounts(countsForSize(w, h, p));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(board);
    return () => ro.disconnect();
  }, []);

  const top = edgeSlotIndices(horiz, 0);
  const right = edgeSlotIndices(vert, top[top.length - 1]! + 1);
  const bottom = edgeSlotIndices(horiz, right[right.length - 1]! + 1);
  const left = edgeSlotIndices(vert, bottom[bottom.length - 1]! + 1);

  return (
    <div ref={hostRef} className="page--board__dancers" aria-hidden>
      <div className="page--board__dancers-edge page--board__dancers-edge--top">
        {top.map((i) => (
          <span key={`t-${i}`} className="page--board__dancer" style={{ ['--d' as string]: String(i) }}>
            <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
          </span>
        ))}
      </div>
      <div className="page--board__dancers-edge page--board__dancers-edge--right">
        {right.map((i) => (
          <span key={`r-${i}`} className="page--board__dancer" style={{ ['--d' as string]: String(i) }}>
            <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
          </span>
        ))}
      </div>
      <div className="page--board__dancers-edge page--board__dancers-edge--bottom">
        {[...bottom].reverse().map((i) => (
          <span key={`b-${i}`} className="page--board__dancer" style={{ ['--d' as string]: String(i) }}>
            <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
          </span>
        ))}
      </div>
      <div className="page--board__dancers-edge page--board__dancers-edge--left">
        {[...left].reverse().map((i) => (
          <span key={`l-${i}`} className="page--board__dancer" style={{ ['--d' as string]: String(i) }}>
            <img src={pieceSrc(i)} alt="" width={22} height={22} decoding="async" />
          </span>
        ))}
      </div>
    </div>
  );
}
