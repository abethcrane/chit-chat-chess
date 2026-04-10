/** Square index: file a–h → 0–7, rank 1–8 → 0–7 (rank 0 = white’s back rank). */
export type Square = number;

export type Color = 'w' | 'b';

export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

export type Piece = { color: Color; type: PieceType };

export type CastlingRights = {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
};

export type GameState = {
  board: (Piece | null)[];
  toMove: Color;
  castling: CastlingRights;
  epSquare: Square | null;
  halfmove: number;
  fullmove: number;
};

/** Plain move; castling is king moving two squares horizontally; EP is encoded by to square. */
export type Move = {
  from: Square;
  to: Square;
  /** If omitted and pawn promotes, applyMove defaults to queen. */
  promotion?: Exclude<PieceType, 'K' | 'P'>;
};

export const ALL_PIECE_TYPES: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

export const FILES = 8;
export const RANKS = 8;

export function square(file: number, rank: number): Square {
  return rank * FILES + file;
}

export function fileOf(sq: Square): number {
  return sq % FILES;
}

export function rankOf(sq: Square): number {
  return Math.floor(sq / FILES);
}

export function toAlgebraic(sq: Square): string {
  const f = fileOf(sq);
  const r = rankOf(sq);
  return `${String.fromCharCode(97 + f)}${r + 1}`;
}

export function opposite(c: Color): Color {
  return c === 'w' ? 'b' : 'w';
}
