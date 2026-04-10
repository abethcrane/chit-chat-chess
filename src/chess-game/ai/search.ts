import { applyMoveUnchecked, isInCheck, legalMovesList, moveWouldBeCapture } from '../core/moves';
import type { Color, GameState, Move } from '../core/types';
import { evaluateAbsolute, MATE_VALUE, pieceValue } from './evaluate';

export type AiDifficulty = 'easy' | 'medium' | 'hard';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function orderMoves(state: GameState, moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const capA = moveWouldBeCapture(state, a) ? 1 : 0;
    const capB = moveWouldBeCapture(state, b) ? 1 : 0;
    if (capB !== capA) return capB - capA;
    const vA = state.board[a.to] ? pieceValue(state.board[a.to]!.type) : 0;
    const vB = state.board[b.to] ? pieceValue(state.board[b.to]!.type) : 0;
    return vB - vA;
  });
}

/** Negamax: value from current side-to-move perspective (positive = good for them). */
function negamax(state: GameState, depth: number, alpha: number, beta: number): number {
  const moves = legalMovesList(state);
  const side = state.toMove;

  if (moves.length === 0) {
    if (isInCheck(state, side)) return -(MATE_VALUE - depth);
    return 0;
  }

  if (depth <= 0) {
    const abs = evaluateAbsolute(state);
    return side === 'w' ? abs : -abs;
  }

  let best = -Infinity;
  for (const m of orderMoves(state, moves)) {
    const next = applyMoveUnchecked(state, m);
    const score = -negamax(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function quiescence(state: GameState, depth: number, alpha: number, beta: number): number {
  const stand = (() => {
    const abs = evaluateAbsolute(state);
    return state.toMove === 'w' ? abs : -abs;
  })();

  if (depth <= 0) return stand;

  let best = stand;
  const moves = legalMovesList(state).filter((m) => moveWouldBeCapture(state, m));
  for (const m of orderMoves(state, moves)) {
    const next = applyMoveUnchecked(state, m);
    const score = -quiescence(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Hard search: main depth + shallow quiescence when depth exhausted at capture node. */
function negamaxQs(state: GameState, depth: number, alpha: number, beta: number): number {
  const moves = legalMovesList(state);
  const side = state.toMove;

  if (moves.length === 0) {
    if (isInCheck(state, side)) return -(MATE_VALUE - depth);
    return 0;
  }

  if (depth <= 0) {
    return quiescence(state, 4, alpha, beta);
  }

  let best = -Infinity;
  const capped = orderMoves(state, moves).slice(0, 28);
  for (const m of capped) {
    const next = applyMoveUnchecked(state, m);
    const score = -negamaxQs(next, depth - 1, -beta, -alpha);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function bestMoveAtDepth(state: GameState, depth: number, useQs: boolean): Move | null {
  const moves = legalMovesList(state);
  if (moves.length === 0) return null;
  let bestM = moves[0]!;
  let bestScore = -Infinity;
  const ordered = orderMoves(state, moves);
  const limit = useQs ? Math.min(ordered.length, 28) : ordered.length;
  for (let i = 0; i < limit; i++) {
    const m = ordered[i]!;
    const next = applyMoveUnchecked(state, m);
    const score = -(useQs ? negamaxQs(next, depth - 1, -Infinity, Infinity) : negamax(next, depth - 1, -Infinity, Infinity));
    if (score > bestScore) {
      bestScore = score;
      bestM = m;
    }
  }
  return bestM;
}

export function chooseAiMove(state: GameState, aiColor: Color, difficulty: AiDifficulty): Move | null {
  if (state.toMove !== aiColor) return null;
  const moves = legalMovesList(state);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    const pool = shuffle(moves);
    return pool[0]!;
  }

  if (difficulty === 'medium') {
    return bestMoveAtDepth(state, 3, false);
  }

  return bestMoveAtDepth(state, 4, true);
}
