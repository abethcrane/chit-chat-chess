import { legalMovesList } from '../core/moves';
import type { GameState, PieceType } from '../core/types';

const VALUES: Record<PieceType, number> = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000,
};

/** White minus black material. */
export function materialWhiteMinusBlack(state: GameState): number {
  let s = 0;
  for (const p of state.board) {
    if (!p) continue;
    const v = VALUES[p.type];
    s += p.color === 'w' ? v : -v;
  }
  return s;
}

/**
 * Positive favors white; includes small mobility for side to move (tempo).
 */
export function evaluateAbsolute(state: GameState): number {
  let s = materialWhiteMinusBlack(state);
  const mob = legalMovesList(state).length;
  s += (state.toMove === 'w' ? 1 : -1) * mob * 2;
  return s;
}

export function pieceValue(t: PieceType): number {
  return VALUES[t];
}

export const MATE_VALUE = 1_000_000;
