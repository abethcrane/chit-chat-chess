import { emptyBoard } from './board';
import type { Color, GameState, PieceType } from './types';
import { square } from './types';

const D4 = square(3, 3);
const WC1 = square(2, 0);
const BH8 = square(7, 7);

/**
 * Minimal position for Pretext teaching: kings + one “hero” on d4 (or lone white king vs black king when hero is white king).
 * `toMove` matches the hero so `legalMovesFrom` applies.
 */
export function createTeachingSandbox(hero: { type: PieceType; color: Color }): GameState {
  const board = emptyBoard();

  if (hero.type === 'K' && hero.color === 'w') {
    board[D4] = { color: 'w', type: 'K' };
    board[BH8] = { color: 'b', type: 'K' };
  } else if (hero.type === 'K' && hero.color === 'b') {
    board[D4] = { color: 'b', type: 'K' };
    board[WC1] = { color: 'w', type: 'K' };
  } else {
    board[WC1] = { color: 'w', type: 'K' };
    board[BH8] = { color: 'b', type: 'K' };
    board[D4] = { color: hero.color, type: hero.type };
  }

  return {
    board,
    toMove: hero.color,
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    epSquare: null,
    halfmove: 0,
    fullmove: 1,
  };
}
