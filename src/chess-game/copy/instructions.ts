import type { PieceType } from '../core/types';

/** Rich block for rules UI (headings + bullets per piece type). */
export type InstructionSection = {
  id: PieceType;
  title: string;
  bullets: string[];
};

const TITLES: Record<PieceType, string> = {
  K: 'King',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  P: 'Pawn',
};

const BULLETS: Record<PieceType, string[]> = {
  K: [
    'Moves one square in any direction (and can take pieces on those squares).',
    'You may never move into check (when another piece is "attacking" the king\'s square, i.e. could take him) or stay in check.',
    'Has a bonus move called "Castling": king moves 2 squares toward a rook — only if neither the king nor that rook has moved yet, squares between are empty, the king is not in check/does not pass through an attackd square. Having been in check earlier is fine.',
    'Can never be right next to another king, they must always have a square in between them.',
    'Goal of the game is to capture the other player\'s king - this ends the game.'
  ],
  Q: [
    'Combines rook + bishop movement.',
    'Any number of squares in a straight or diagonal line until blocked.',
    'Can capture the first piece she encounters (if other team\'s).',
    'Worth 9 points.',
  ],
  R: [
    'Slides along "ranks" and "files" only (moves side to side or up and down, only in straight lines, no diagonals).',
    'Moves any distance until blocked',
    'Can capture the first piece it encounters (if other team\'s).',
    'Worth 5 points.',
  ],
  B: [
    'Slides diagonally any distance until blocked.',
    'Can capture the first piece it encounters (if other team\'s).',
    'Each bishop stays on the same square color it starts on for the whole game.',
    'Worth 3 points.',
  ],
  N: [
    'Moves in an “L”: two squares one way, one perpendicular.',
    'Jumps over anything in between — only the destination square matters.',
    'Can capture the piece on its target square (if other team\'s).',
    'Objectively the best piece (it\'s a horse, duh).',
    'Worth 3 points.',
  ],
  P: [
    'Forward 1 square, or 2 from its starting rank (row) if both squares ahead are empty.',
    'Captures diagonally forward only.',
    'Reaching the far rank "promotes" it (you can replace it with any piece - on this site we always choose a queen).',
    'Has a funky little move called "en passant" if your opponent moves 2 squares, and your pawn could have captured it if they had only moved 1.',
    'Worth 1 point.'
  ],
};

const ORDER: PieceType[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

export function composeInstructionSections(enabledTypes: ReadonlySet<PieceType>): InstructionSection[] {
  const out: InstructionSection[] = [];
  for (const t of ORDER) {
    if (!enabledTypes.has(t)) continue;
    out.push({ id: t, title: TITLES[t], bullets: BULLETS[t] });
  }
  return out;
}

/** Plain prose for screen readers / search (no structure). */
export function composeInstructionPlain(enabledTypes: ReadonlySet<PieceType>): string {
  const parts: string[] = [];
  for (const s of composeInstructionSections(enabledTypes)) {
    parts.push(`${s.title}. ${s.bullets.join(' ')}`);
  }
  return parts.join(' ');
}

/** @deprecated Prefer composeInstructionSections */
export function composeInstructionText(enabledTypes: ReadonlySet<PieceType>): string {
  return composeInstructionPlain(enabledTypes);
}

export function instructionForType(t: PieceType): string {
  return BULLETS[t].join(' ');
}
