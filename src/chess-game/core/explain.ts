import { pieceAt } from './board';
import {
  isInCheck,
  isSquareAttacked,
  legalMovesFrom,
  moveWouldBeCapture,
  pseudoLegalMovesFrom,
} from './moves';
import type { GameState, Move, Piece, PieceType, Square } from './types';
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
  | 'illegal_castle_blocked'
  | 'info_same_square';

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

/** Richer pawn “why not” when hovering a square that isn’t legal. */
function explainPawnBlocked(
  state: GameState,
  from: Square,
  to: Square,
  piece: Piece,
): { tag: ExplainTag; text: string } | null {
  const step = piece.color === 'w' ? 1 : -1;
  const df = fileOf(to) - fileOf(from);
  const dr = rankOf(to) - rankOf(from);
  const occ = pieceAt(state, to);

  if (occ && occ.color !== piece.color) {
    if (df === 0 && dr === step) {
      return {
        tag: 'illegal_no_piece_pattern',
        text: 'Pawns don’t capture straight ahead — only diagonally forward. That square is blocked by an enemy piece; you can’t step forward onto it unless you take on a diagonal.',
      };
    }
    if (df === 0 && dr === 2 * step) {
      return {
        tag: 'illegal_blocked',
        text: 'Pawns can’t capture straight ahead, and they can’t jump a piece — so you can’t land here with a two-square push.',
      };
    }
    if (Math.abs(df) <= 1) {
      return {
        tag: 'illegal_no_piece_pattern',
        text: 'Pawns capture only one square diagonally forward. This enemy isn’t on a square this pawn can take from here.',
      };
    }
  }

  if (occ && occ.color === piece.color) {
    if (df === 0 && (dr === step || dr === 2 * step)) {
      return {
        tag: 'illegal_blocked',
        text: 'Your own piece sits on that line — pawns can’t move through or onto a friendly square.',
      };
    }
    if (Math.abs(df) === 1 && dr === step) {
      return {
        tag: 'illegal_blocked',
        text: 'Your own piece is on that diagonal — pawns only capture enemies, not friends.',
      };
    }
  }

  if (!occ && df === 0 && dr === 2 * step) {
    const mid = squareSafe(fileOf(from), rankOf(from) + step);
    if (mid !== null && pieceAt(state, mid)) {
      return {
        tag: 'illegal_blocked',
        text: 'The square straight in front is occupied — pawns can’t jump over it, even on the first move.',
      };
    }
    const pawnStartRank = piece.color === 'w' ? 1 : 6;
    if (rankOf(from) !== pawnStartRank) {
      return {
        tag: 'illegal_no_piece_pattern',
        text: 'pawns can only move 2 squares forward from their starting position.',
      };
    }
  }

  return null;
}

export function explainSquare(state: GameState, from: Square, to: Square): { tag: ExplainTag; text: string } {
  if (from === to) {
    const sel = pieceAt(state, from);
    const nm = sel ? pieceName(sel.type) : 'piece';
    return {
      tag: 'info_same_square',
      text: `That’s the ${nm} you selected — there’s no move until you aim at another square. Hover a highlighted square for a legal move, or any other square to see why it’s not allowed.`,
    };
  }

  const piece = pieceAt(state, from);
  if (!piece) {
    return { tag: 'illegal_empty', text: 'Empty square — pick one of your pieces.' };
  }
  if (piece.color !== state.toMove) {
    return {
      tag: 'illegal_opponent_piece',
      text: `That's your opponent's ${pieceName(piece.type)}.`,
    };
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
      const victim = pieceAt(state, to);
      if (victim?.type === 'N') {
        return { tag: 'legal_capture', text: "please don't take my horse i love him!" };
      }
      if (victim) {
        return {
          tag: 'legal_capture',
          text: `You can capture that ${pieceName(victim.type)}.`,
        };
      }
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
    const pawnHint = explainPawnBlocked(state, from, to, piece);
    if (pawnHint) return pawnHint;
    return {
      tag: 'illegal_no_piece_pattern',
      text: 'Pawns move straight forward to empty squares, or one square diagonally forward to capture. This destination doesn’t fit either.',
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

/** Lowercase name for prose: "pawn", "king", etc. */
export function pieceName(t: PieceType): string {
  switch (t) {
    case 'K':
      return 'king';
    case 'Q':
      return 'queen';
    case 'R':
      return 'rook';
    case 'B':
      return 'bishop';
    case 'N':
      return 'knight';
    case 'P':
      return 'pawn';
  }
}

export function formatSquareLabel(sq: Square): string {
  return toAlgebraic(sq);
}
