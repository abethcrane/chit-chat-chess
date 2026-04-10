import type { PieceType } from '../core/types';

const BY_TYPE: Record<PieceType, string> = {
  K: 'The king steps one square in any direction. You must never move into check. Castling is a special jump with a rook when neither has moved, the path is clear, and you do not castle through or into attack.',
  Q: 'The queen combines rook and bishop: any straight or diagonal line, any distance, stopping at the first piece (friend or foe).',
  R: 'The rook slides along ranks and files until blocked. It is powerful on open files.',
  B: 'The bishop slides diagonally any distance until blocked. Each bishop stays on one color complex.',
  N: 'The knight moves in an “L”: two squares one way and one perpendicular. It jumps over pieces in between.',
  P: 'Pawns move forward one square, or two from their starting rank if both squares are empty. They capture diagonally forward only. On the last rank a pawn promotes (here we usually crown a queen).',
};

/** Compose teaching paragraphs for enabled types (kings always included). */
export function composeInstructionText(enabledTypes: ReadonlySet<PieceType>): string {
  const order: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
  const parts: string[] = [];
  for (const t of order) {
    if (enabledTypes.has(t)) parts.push(BY_TYPE[t]);
  }
  return parts.join(' ');
}

export function instructionForType(t: PieceType): string {
  return BY_TYPE[t];
}
