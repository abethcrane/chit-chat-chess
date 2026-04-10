import type { Piece } from './core/types';

/**
 * URL path for a piece sprite, relative to `import.meta.env.BASE_URL` (include `images/...`).
 * White king/queen use the legacy root assets until matching `pieces/` photos exist.
 */
export function pieceImagePath(p: Piece): string {
  const w = p.color === 'w';
  switch (p.type) {
    case 'P':
      return w ? 'images/pieces/white-pawn.png' : 'images/pieces/black-pawn.png';
    case 'N':
      return w ? 'images/pieces/white-knight1.png' : 'images/pieces/black-knight1.png';
    case 'B':
      return w ? 'images/pieces/white-bishop.png' : 'images/pieces/black-bishop.png';
    case 'R':
      return w ? 'images/pieces/white-rook.png' : 'images/pieces/black-rook.png';
    case 'Q':
      return w ? 'images/queen.png' : 'images/pieces/black-queen.png';
    case 'K':
      return w ? 'images/king.png' : 'images/pieces/black-king.png';
  }
}

export function pieceImageUrl(baseUrl: string, p: Piece): string {
  return `${baseUrl}${pieceImagePath(p)}`;
}
