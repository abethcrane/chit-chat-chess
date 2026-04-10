import { filterBoardByTypes, standardPieces } from './board';
import { applyMove, applyMoveUnchecked, isInCheck, legalMoves, legalMovesList } from './moves';
import type { CastlingRights, Color, GameState, Move, PieceType } from './types';
import { opposite, square } from './types';

const DEFAULT_CASTLING: CastlingRights = {
  wK: true,
  wQ: true,
  bK: true,
  bQ: true,
};

export type GamePhase = 'playing' | 'checkmate' | 'stalemate' | 'draw';

export type GameOutcome = {
  phase: GamePhase;
  /** Winner color if checkmate. */
  winner?: Color;
  /** Side that is in check (after last move), if any. */
  sideInCheck?: Color;
};

function hasBothKings(board: (import('./types').Piece | null)[]): boolean {
  let w = false;
  let b = false;
  for (const p of board) {
    if (p?.type === 'K') {
      if (p.color === 'w') w = true;
      else b = true;
    }
  }
  return w && b;
}

/**
 * New game from enabled piece types (must include `'K'`).
 * Castling rights only if both king and that-side rook exist on home squares.
 */
export function createGame(enabledTypes: ReadonlySet<PieceType>): GameState {
  if (!enabledTypes.has('K')) {
    throw new Error('createGame: king must be enabled');
  }
  const board = filterBoardByTypes(standardPieces(), enabledTypes);
  if (!hasBothKings(board)) {
    throw new Error('createGame: both kings required after filter');
  }

  const castling = { ...DEFAULT_CASTLING };
  const wk = square(4, 0);
  const bk = square(4, 7);
  if (!board[wk] || board[wk]?.type !== 'K' || board[wk]?.color !== 'w') {
    castling.wK = false;
    castling.wQ = false;
  } else {
    if (!isHomeRook(board, square(0, 0), 'w')) castling.wQ = false;
    if (!isHomeRook(board, square(7, 0), 'w')) castling.wK = false;
  }
  if (!board[bk] || board[bk]?.type !== 'K' || board[bk]?.color !== 'b') {
    castling.bK = false;
    castling.bQ = false;
  } else {
    if (!isHomeRook(board, square(0, 7), 'b')) castling.bQ = false;
    if (!isHomeRook(board, square(7, 7), 'b')) castling.bK = false;
  }

  return {
    board,
    toMove: 'w',
    castling,
    epSquare: null,
    halfmove: 0,
    fullmove: 1,
  };
}

function isHomeRook(board: (import('./types').Piece | null)[], sq: number, color: Color): boolean {
  const p = board[sq];
  return !!(p && p.type === 'R' && p.color === color);
}

export function evaluateOutcome(state: GameState): GameOutcome {
  const side = state.toMove;
  const moves = legalMovesList(state);
  const opp = opposite(side);
  const kingChecked = isInCheck(state, side);

  if (moves.length === 0) {
    if (kingChecked) {
      return { phase: 'checkmate', winner: opp, sideInCheck: side };
    }
    return { phase: 'stalemate', sideInCheck: undefined };
  }

  // 50-move rule (optional strictness)
  if (state.halfmove >= 100) {
    return { phase: 'draw' };
  }

  return {
    phase: 'playing',
    sideInCheck: kingChecked ? side : undefined,
  };
}

/** Safe apply: returns null if illegal. */
export function tryApplyMove(state: GameState, move: Move): GameState | null {
  return applyMove(state, move);
}

/** Inspect position after a move (caller must ensure move was applied legally). */
export function outcomeAfterMove(prev: GameState, move: Move): GameOutcome {
  const next = applyMoveUnchecked(prev, move);
  return evaluateOutcome(next);
}

export { applyMove, applyMoveUnchecked, isInCheck, legalMoves, legalMovesList };
