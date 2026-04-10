import { pieceAt } from './board';
import {
  isInCheck,
  isSquareAttacked,
  legalMovesFrom,
  moveWouldBeCapture,
  pseudoLegalMovesFrom,
} from './moves';
import type { GameState, Move, Square } from './types';
import { fileOf, opposite, rankOf, toAlgebraic } from './types';

export type ExplainTag =
  | 'legal_quiet'
  | 'legal_capture'
  | 'legal_castle_k'
  | 'legal_castle_q'
  | 'legal_en_passant'
  | 'legal_promotion'
  | 'illegal_wrong_turn'
  | 'illegal_empty'
  | 'illegal_opponent_piece'
  | 'illegal_no_piece_pattern'
  | 'illegal_blocked'
  | 'illegal_king_in_check_after'
  | 'illegal_castle_through_check'
  | 'illegal_castle_in_check'
  | 'illegal_castle_blocked';

function isCastleShape(from: Square, to: Square): 'k' | 'q' | null {
  const df = fileOf(to) - fileOf(from);
  if (rankOf(to) !== rankOf(from)) return null;
  if (Math.abs(df) !== 2) return null;
  return df > 0 ? 'k' : 'q';
}

function pickLegalMove(legal: Move[], from: Square, to: Square): Move | null {
  const candidates = legal.filter((m) => m.from === from && m.to === to);
  if (candidates.length === 0) return null;
  return candidates[0]!;
}

function castleBlockedReason(state: GameState, from: Square, side: 'k' | 'q'): string | null {
  const p = pieceAt(state, from);
  if (!p || p.type !== 'K') return null;
  const c = p.color;
  const r = rankOf(from);
  if (c === 'w' && r !== 0) return null;
  if (c === 'b' && r !== 7) return null;
  if (fileOf(from) !== 4) return null;

  if (side === 'k') {
    if (c === 'w' && !state.castling.wK) return 'Kingside castling is not available (king or rook has moved).';
    if (c === 'b' && !state.castling.bK) return 'Kingside castling is not available (king or rook has moved).';
    const f1 = squareSafe(5, r);
    const f2 = squareSafe(6, r);
    if (f1 === null || f2 === null) return null;
    if (state.board[f1] || state.board[f2]) return 'Pieces block the path for kingside castling.';
    const rookSq = squareSafe(7, r);
    const rook = rookSq !== null ? state.board[rookSq] : null;
    if (!rook || rook.type !== 'R' || rook.color !== c) return 'No rook on the kingside corner to castle with.';
  } else {
    if (c === 'w' && !state.castling.wQ) return 'Queenside castling is not available (king or rook has moved).';
    if (c === 'b' && !state.castling.bQ) return 'Queenside castling is not available (king or rook has moved).';
    const b1 = squareSafe(3, r);
    const b2 = squareSafe(2, r);
    const b3 = squareSafe(1, r);
    if (b1 === null || b2 === null || b3 === null) return null;
    if (state.board[b1] || state.board[b2] || state.board[b3])
      return 'Pieces block the path for queenside castling.';
    const rookSq = squareSafe(0, r);
    const rook = rookSq !== null ? state.board[rookSq] : null;
    if (!rook || rook.type !== 'R' || rook.color !== c) return 'No rook on the queenside corner to castle with.';
  }
  return null;
}

function squareSafe(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return rank * 8 + file;
}

export function explainSquare(state: GameState, from: Square, to: Square): { tag: ExplainTag; text: string } {
  const piece = pieceAt(state, from);
  if (!piece) {
    return { tag: 'illegal_empty', text: 'Empty square — pick one of your pieces.' };
  }
  if (piece.color !== state.toMove) {
    return { tag: 'illegal_opponent_piece', text: "That's your opponent's piece; it's not your turn to move it." };
  }

  const legal = legalMovesFrom(state, from);
  const legalHit = pickLegalMove(legal, from, to);
  if (legalHit) {
    const castle = isCastleShape(from, to);
    if (castle) {
      return castle === 'k'
        ? {
            tag: 'legal_castle_k',
            text: 'Kingside castle: king jumps two squares toward the rook; the rook slides across.',
          }
        : {
            tag: 'legal_castle_q',
            text: 'Queenside castle: king jumps two squares toward the rook; the rook slides across.',
          };
    }
    if (piece.type === 'P' && to === state.epSquare) {
      return {
        tag: 'legal_en_passant',
        text: 'En passant: capture the pawn that just dashed past, as if it only moved one square.',
      };
    }
    if (legalHit.promotion) {
      return {
        tag: 'legal_promotion',
        text: `Promotion: your pawn reaches the last rank and becomes a ${pieceName(legalHit.promotion)}.`,
      };
    }
    if (moveWouldBeCapture(state, legalHit)) {
      return { tag: 'legal_capture', text: 'Legal capture — take the piece on that square.' };
    }
    return { tag: 'legal_quiet', text: 'Legal move — that square is free for this piece.' };
  }

  const pseudo = pseudoLegalMovesFrom(state, from);
  const pseudoHit = pseudo.some((m) => m.from === from && m.to === to);
  if (pseudoHit) {
    // Castle pseudo-legal but filtered
    const castle = isCastleShape(from, to);
    if (castle && piece.type === 'K') {
      if (isInCheck(state, piece.color)) {
        return { tag: 'illegal_castle_in_check', text: "Can't castle while your king is in check." };
      }
      const r = rankOf(from);
      const step = castle === 'k' ? 1 : -1;
      const pass1 = squareSafe(4 + step, r);
      const pass2 = to;
      if (pass1 !== null && isSquareAttacked(state, pass1, opposite(piece.color))) {
        return {
          tag: 'illegal_castle_through_check',
          text: "Can't castle through a square the enemy attacks.",
        };
      }
      if (isSquareAttacked(state, pass2, opposite(piece.color))) {
        return {
          tag: 'illegal_castle_through_check',
          text: "Can't castle into check — the landing square is attacked.",
        };
      }
    }
    return {
      tag: 'illegal_king_in_check_after',
      text: "Illegal — that would leave (or keep) your king in check.",
    };
  }

  // Not even pseudo-legal
  const castleTry = isCastleShape(from, to);
  if (piece.type === 'K' && castleTry) {
    const br = castleBlockedReason(state, from, castleTry);
    if (br) return { tag: 'illegal_castle_blocked', text: br };
  }

  if (['R', 'B', 'Q'].includes(piece.type)) {
    return {
      tag: 'illegal_blocked',
      text: 'That square is not reachable along a clear line for this piece (blocked or wrong direction).',
    };
  }
  if (piece.type === 'N') {
    return { tag: 'illegal_no_piece_pattern', text: 'Knights move in an “L” — this square is not a knight hop away.' };
  }
  if (piece.type === 'P') {
    return {
      tag: 'illegal_no_piece_pattern',
      text: 'Pawns move forward (or diagonally only to capture). This square does not match a pawn move.',
    };
  }
  if (piece.type === 'K') {
    return {
      tag: 'illegal_no_piece_pattern',
      text: 'Kings move one square in any direction (except illegal castle attempts, shown separately).',
    };
  }

  return { tag: 'illegal_no_piece_pattern', text: 'That is not a legal destination for the selected piece.' };
}

function pieceName(t: string): string {
  switch (t) {
    case 'Q':
      return 'queen';
    case 'R':
      return 'rook';
    case 'B':
      return 'bishop';
    case 'N':
      return 'knight';
    default:
      return t.toLowerCase();
  }
}

export function formatSquareLabel(sq: Square): string {
  return toAlgebraic(sq);
}
