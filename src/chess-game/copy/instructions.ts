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
    'Moves one square in any direction.',
    'You may never move into check or stay in check.',
    'Castling: king jumps two toward a rook — only if neither that king nor that rook has moved yet, squares between are empty, the king is not in check, and he does not pass through or land on an attacked square. Having been in check earlier is fine.',
  ],
  Q: [
    'Combines rook + bishop movement.',
    'Any number of squares along a rank, file, or diagonal until blocked.',
    'Stops at the first piece; can capture an enemy on that square.',
  ],
  R: [
    'Slides along ranks and files only.',
    'Any distance until blocked; captures on the landing square.',
    'Often strongest on open files.',
  ],
  B: [
    'Slides diagonally any distance until blocked.',
    'Stays on the same square color for the whole game.',
  ],
  N: [
    'Moves in an “L”: two squares one way, one perpendicular.',
    'Jumps over anything in between — only the destination square matters.',
  ],
  P: [
    'Forward one square, or two from its starting rank if both squares ahead are empty.',
    'Captures diagonally forward only.',
    'Reaching the far rank promotes (in play we default to a queen).',
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
