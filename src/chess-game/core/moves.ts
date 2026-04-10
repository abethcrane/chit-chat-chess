import { kingSquare, stripCastlingForSquare } from './board';
import type { Color, GameState, Move, Piece, Square } from './types';
import { fileOf, opposite, rankOf, square } from './types';

const KNIGHT_DELTAS: [number, number][] = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_DELTAS: [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const ROOK_DIRS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const BISHOP_DIRS: [number, number][] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function onBoard(file: number, rank: number): boolean {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function addDelta(sq: Square, df: number, dr: number): Square | null {
  const f = fileOf(sq) + df;
  const r = rankOf(sq) + dr;
  if (!onBoard(f, r)) return null;
  return square(f, r);
}

/** Would `byColor` attack `target` if it were their turn? (Kings use one-step only.) */
export function isSquareAttacked(state: GameState, target: Square, byColor: Color): boolean {
  const occ = state.board;

  // Pawns
  for (let sq = 0; sq < 64; sq++) {
    const p = occ[sq];
    if (!p || p.color !== byColor || p.type !== 'P') continue;
    if (byColor === 'w') {
      const atk1 = addDelta(sq, -1, 1);
      const atk2 = addDelta(sq, 1, 1);
      if (atk1 === target || atk2 === target) return true;
    } else {
      const atk1 = addDelta(sq, -1, -1);
      const atk2 = addDelta(sq, 1, -1);
      if (atk1 === target || atk2 === target) return true;
    }
  }

  // Knights
  for (const [df, dr] of KNIGHT_DELTAS) {
    const to = addDelta(target, df, dr);
    if (to === null) continue;
    const p = occ[to];
    if (p && p.color === byColor && p.type === 'N') return true;
  }

  // King (adjacent)
  for (const [df, dr] of KING_DELTAS) {
    const to = addDelta(target, df, dr);
    if (to === null) continue;
    const p = occ[to];
    if (p && p.color === byColor && p.type === 'K') return true;
  }

  // Rooks / Queens (orthogonal rays from target)
  for (const [df, dr] of ROOK_DIRS) {
    let f = fileOf(target) + df;
    let r = rankOf(target) + dr;
    while (onBoard(f, r)) {
      const p = occ[square(f, r)];
      if (p) {
        if (p.color === byColor && (p.type === 'R' || p.type === 'Q')) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  // Bishops / Queens (diagonal)
  for (const [df, dr] of BISHOP_DIRS) {
    let f = fileOf(target) + df;
    let r = rankOf(target) + dr;
    while (onBoard(f, r)) {
      const p = occ[square(f, r)];
      if (p) {
        if (p.color === byColor && (p.type === 'B' || p.type === 'Q')) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  return false;
}

export function isInCheck(state: GameState, color: Color): boolean {
  const k = kingSquare(state, color);
  if (k === null) return false;
  return isSquareAttacked(state, k, opposite(color));
}

function pushMove(out: Move[], from: Square, to: Square, promotion?: Move['promotion']) {
  out.push(promotion ? { from, to, promotion } : { from, to });
}

function pseudoLegalMovesForPiece(state: GameState, from: Square, piece: Piece, out: Move[]): void {
  const { color: c, type: t } = piece;
  const occ = state.board;

  if (t === 'N') {
    for (const [df, dr] of KNIGHT_DELTAS) {
      const to = addDelta(from, df, dr);
      if (to === null) continue;
      const target = occ[to];
      if (!target || target.color !== c) pushMove(out, from, to);
    }
    return;
  }

  if (t === 'K') {
    for (const [df, dr] of KING_DELTAS) {
      const to = addDelta(from, df, dr);
      if (to === null) continue;
      const target = occ[to];
      if (!target || target.color !== c) pushMove(out, from, to);
    }
    // Castling
    const r = rankOf(from);
    const f = fileOf(from);
    if (c === 'w' && r === 0 && f === 4) {
      if (state.castling.wK && !occ[square(5, 0)] && !occ[square(6, 0)]) {
        const rook = occ[square(7, 0)];
        if (rook && rook.type === 'R' && rook.color === 'w') {
          pushMove(out, from, square(6, 0));
        }
      }
      if (state.castling.wQ && !occ[square(3, 0)] && !occ[square(2, 0)] && !occ[square(1, 0)]) {
        const rook = occ[square(0, 0)];
        if (rook && rook.type === 'R' && rook.color === 'w') {
          pushMove(out, from, square(2, 0));
        }
      }
    }
    if (c === 'b' && r === 7 && f === 4) {
      if (state.castling.bK && !occ[square(5, 7)] && !occ[square(6, 7)]) {
        const rook = occ[square(7, 7)];
        if (rook && rook.type === 'R' && rook.color === 'b') {
          pushMove(out, from, square(6, 7));
        }
      }
      if (state.castling.bQ && !occ[square(3, 7)] && !occ[square(2, 7)] && !occ[square(1, 7)]) {
        const rook = occ[square(0, 7)];
        if (rook && rook.type === 'R' && rook.color === 'b') {
          pushMove(out, from, square(2, 7));
        }
      }
    }
    return;
  }

  if (t === 'P') {
    const dir = c === 'w' ? 1 : -1;
    const startRank = c === 'w' ? 1 : 6;
    const promoRank = c === 'w' ? 7 : 0;

    const one = addDelta(from, 0, dir);
    if (one !== null && !occ[one]) {
      if (rankOf(one) === promoRank) {
        pushMove(out, from, one, 'Q');
        pushMove(out, from, one, 'R');
        pushMove(out, from, one, 'B');
        pushMove(out, from, one, 'N');
      } else {
        pushMove(out, from, one);
        if (rankOf(from) === startRank) {
          const two = addDelta(from, 0, 2 * dir);
          if (two !== null && !occ[two]) pushMove(out, from, two);
        }
      }
    }
    for (const df of [-1, 1]) {
      const cap = addDelta(from, df, dir);
      if (cap === null) continue;
      const target = occ[cap];
      if (target && target.color !== c) {
        if (rankOf(cap) === promoRank) {
          pushMove(out, from, cap, 'Q');
          pushMove(out, from, cap, 'R');
          pushMove(out, from, cap, 'B');
          pushMove(out, from, cap, 'N');
        } else {
          pushMove(out, from, cap);
        }
      } else if (!target && state.epSquare === cap) {
        const epPawnSq = square(fileOf(cap), rankOf(cap) - dir);
        const epP = occ[epPawnSq];
        if (epP && epP.type === 'P' && epP.color !== c) pushMove(out, from, cap);
      }
    }
    return;
  }

  const dirs =
    t === 'R' ? ROOK_DIRS : t === 'B' ? BISHOP_DIRS : t === 'Q' ? [...ROOK_DIRS, ...BISHOP_DIRS] : [];
  for (const [df, dr] of dirs) {
    let f = fileOf(from) + df;
    let r = rankOf(from) + dr;
    while (onBoard(f, r)) {
      const to = square(f, r);
      const target = occ[to];
      if (!target) {
        pushMove(out, from, to);
      } else {
        if (target.color !== c) pushMove(out, from, to);
        break;
      }
      f += df;
      r += dr;
    }
  }
}

/** Pseudo-legal: ignores moving into check; castling still filtered for path through check in legalMoves. */
export function pseudoLegalMoves(state: GameState): Move[] {
  const out: Move[] = [];
  const c = state.toMove;
  for (let from = 0; from < 64; from++) {
    const p = state.board[from];
    if (!p || p.color !== c) continue;
    pseudoLegalMovesForPiece(state, from, p, out);
  }
  return out;
}

export function pseudoLegalMovesFrom(state: GameState, from: Square): Move[] {
  const p = state.board[from];
  if (!p || p.color !== state.toMove) return [];
  const out: Move[] = [];
  pseudoLegalMovesForPiece(state, from, p, out);
  return out;
}

function isCastleMove(piece: Piece, from: Square, to: Square): 'k' | 'q' | null {
  if (piece.type !== 'K') return null;
  const df = fileOf(to) - fileOf(from);
  if (Math.abs(df) !== 2 || rankOf(to) !== rankOf(from)) return null;
  return df > 0 ? 'k' : 'q';
}

/** Apply move without legality check (internal). */
export function applyMoveUnchecked(state: GameState, move: Move): GameState {
  const board = [...state.board];
  const { from, to, promotion } = move;
  const piece = board[from]!;
  let castling = stripCastlingForSquare(state.castling, from);
  castling = stripCastlingForSquare(castling, to);

  const castle = isCastleMove(piece, from, to);
  let epSquare: Square | null = null;
  let captured = board[to];

  // En passant capture
  if (piece.type === 'P' && to === state.epSquare && !captured) {
    const dir = piece.color === 'w' ? -1 : 1;
    const capSq = square(fileOf(to), rankOf(to) + dir);
    captured = board[capSq];
    board[capSq] = null;
  }

  board[from] = null;

  let placed: Piece = piece;
  if (piece.type === 'P' && (rankOf(to) === 0 || rankOf(to) === 7)) {
    placed = { color: piece.color, type: promotion ?? 'Q' };
  }

  if (castle && piece.type === 'K') {
    const r = rankOf(from);
    if (castle === 'k') {
      board[to] = placed;
      const rf = square(7, r);
      const rt = square(5, r);
      const rook = board[rf];
      board[rf] = null;
      board[rt] = rook!;
    } else {
      board[to] = placed;
      const rf = square(0, r);
      const rt = square(3, r);
      const rook = board[rf];
      board[rf] = null;
      board[rt] = rook!;
    }
  } else {
    board[to] = placed;
  }

  // EP target after double pawn push
  if (piece.type === 'P' && Math.abs(to - from) === 16) {
    epSquare = square(fileOf(from), rankOf(from) + (piece.color === 'w' ? 1 : -1));
  }

  const nextTo = opposite(state.toMove);
  let halfmove = state.halfmove + 1;
  if (piece.type === 'P' || captured) halfmove = 0;

  let fullmove = state.fullmove;
  if (state.toMove === 'b') fullmove += 1;

  return {
    board,
    toMove: nextTo,
    castling,
    epSquare,
    halfmove,
    fullmove,
  };
}

export function applyMove(state: GameState, move: Move): GameState | null {
  const legal = legalMoves(state);
  const ok = legal.some((m) => moveKey(m) === moveKey(move));
  if (!ok) return null;
  return applyMoveUnchecked(state, move);
}

function moveKey(m: Move): string {
  return `${m.from}-${m.to}-${m.promotion ?? ''}`;
}

export function legalMoves(state: GameState): Move[] {
  const pseudo = pseudoLegalMoves(state);
  const c = state.toMove;
  const out: Move[] = [];

  for (const m of pseudo) {
    const piece = state.board[m.from]!;
    const castle = isCastleMove(piece, m.from, m.to);

    if (castle) {
      const r = rankOf(m.from);
      const f0 = fileOf(m.from);
      const step = castle === 'k' ? 1 : -1;
      // king not in check, path squares not attacked
      if (isInCheck(state, c)) continue;
      const pass1 = square(f0 + step, r);
      const pass2 = m.to;
      if (isSquareAttacked(state, pass1, opposite(c))) continue;
      if (isSquareAttacked(state, pass2, opposite(c))) continue;
    }

    const next = applyMoveUnchecked(state, m);
    if (!isInCheck(next, c)) out.push(m);
  }
  return out;
}

export function legalMovesFrom(state: GameState, from: Square): Move[] {
  return legalMoves(state).filter((m) => m.from === from);
}

/** For AI / tests: all legal moves from current side. */
export function legalMovesList(state: GameState): Move[] {
  return legalMoves(state);
}

export function moveWouldBeCapture(state: GameState, m: Move): boolean {
  const target = state.board[m.to];
  if (target) return true;
  const p = state.board[m.from];
  if (p?.type === 'P' && m.to === state.epSquare) return true;
  return false;
}

/** Piece removed by the opponent when this move is played (null if none / castling). */
export function getCapturedPiece(state: GameState, move: Move): Piece | null {
  const piece = state.board[move.from];
  if (!piece) return null;
  if (isCastleMove(piece, move.from, move.to)) return null;
  let captured = state.board[move.to];
  if (piece.type === 'P' && move.to === state.epSquare && !captured) {
    const dir = piece.color === 'w' ? -1 : 1;
    const capSq = square(fileOf(move.to), rankOf(move.to) + dir);
    return state.board[capSq];
  }
  return captured;
}
