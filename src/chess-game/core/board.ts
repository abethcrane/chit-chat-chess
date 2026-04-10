import type { CastlingRights, Color, GameState, Piece, PieceType, Square } from './types';
import { fileOf, rankOf, square } from './types';

export function emptyBoard(): (Piece | null)[] {
  return Array<(Piece | null)>(64).fill(null);
}

/** Standard start before filtering by enabled types. */
export function standardPieces(): (Piece | null)[] {
  const b = emptyBoard();
  const w = (t: PieceType, f: number, r: number) => {
    b[square(f, r)] = { color: 'w', type: t };
  };
  const bk = (t: PieceType, f: number, r: number) => {
    b[square(f, r)] = { color: 'b', type: t };
  };
  w('R', 0, 0);
  w('N', 1, 0);
  w('B', 2, 0);
  w('Q', 3, 0);
  w('K', 4, 0);
  w('B', 5, 0);
  w('N', 6, 0);
  w('R', 7, 0);
  for (let f = 0; f < 8; f++) w('P', f, 1);

  bk('R', 0, 7);
  bk('N', 1, 7);
  bk('B', 2, 7);
  bk('Q', 3, 7);
  bk('K', 4, 7);
  bk('B', 5, 7);
  bk('N', 6, 7);
  bk('R', 7, 7);
  for (let f = 0; f < 8; f++) bk('P', f, 6);
  return b;
}

/**
 * Keep only pieces whose type is enabled; kings always stay.
 * `enabled` must include `'K'`.
 */
export function filterBoardByTypes(board: (Piece | null)[], enabled: ReadonlySet<PieceType>): (Piece | null)[] {
  const out = emptyBoard();
  for (let sq = 0; sq < 64; sq++) {
    const p = board[sq];
    if (!p) continue;
    if (p.type === 'K' || enabled.has(p.type)) out[sq] = p;
  }
  return out;
}

export function pieceAt(state: GameState, sq: Square): Piece | null {
  return state.board[sq] ?? null;
}

export function kingSquare(state: GameState, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.type === 'K' && p.color === color) return sq;
  }
  return null;
}

/** Adjust castling rights when a piece leaves a home corner. */
export function stripCastlingForSquare(c: CastlingRights, sq: Square): CastlingRights {
  const f = fileOf(sq);
  const r = rankOf(sq);
  const next = { ...c };
  if (sq === square(0, 0)) next.wQ = false;
  if (sq === square(7, 0)) next.wK = false;
  if (sq === square(0, 7)) next.bQ = false;
  if (sq === square(7, 7)) next.bK = false;
  if (r === 0 && f === 4) {
    next.wK = false;
    next.wQ = false;
  }
  if (r === 7 && f === 4) {
    next.bK = false;
    next.bQ = false;
  }
  return next;
}
