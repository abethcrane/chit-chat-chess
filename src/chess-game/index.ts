/** Portable chess kit — no React app imports. */

export type { CastlingRights, Color, GameState, Move, Piece, PieceType, Square } from './core/types';
export { ALL_PIECE_TYPES, fileOf, opposite, rankOf, square, toAlgebraic } from './core/types';

export type { GameOutcome, GamePhase } from './core/game';
export { createGame, evaluateOutcome, outcomeAfterMove, tryApplyMove } from './core/game';
export {
  applyMove,
  applyMoveUnchecked,
  isInCheck,
  legalMoves,
  legalMovesFrom,
  legalMovesList,
  pseudoLegalMovesFrom,
} from './core/moves';
export type { ExplainTag } from './core/explain';
export { explainSquare, formatSquareLabel } from './core/explain';

export {
  composeInstructionPlain,
  composeInstructionSections,
  composeInstructionText,
  instructionForType,
  type InstructionSection,
} from './copy/instructions';

export { pieceImagePath, pieceImageUrl, pieceTypeTogglePath } from './pieceArt';

export type { AiDifficulty } from './ai/search';
export { chooseAiMove } from './ai/search';

export { ChessMatch, type ChessMatchProps } from './ChessMatch';
