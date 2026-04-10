import type { Piece, Square } from './core/types';
import { fileOf } from './core/types';

/**
 * URL path for a piece sprite, relative to `import.meta.env.BASE_URL` (include `images/...`).
 * Pass `sq` for knights so queenside (files a–d) uses *knight1* and kingside (e–h) *knight2*.
 */
export function pieceImagePath(p: Piece, sq?: Square): string {
  const w = p.color === 'w';
  switch (p.type) {
    case 'P':
      return w ? 'images/pieces/white-pawn.png' : 'images/pieces/black-pawn.png';
    case 'N': {
      const side = sq === undefined || fileOf(sq) < 4 ? '1' : '2';
      return w ? `images/pieces/white-knight${side}.png` : `images/pieces/black-knight${side}.png`;
    }
    case 'B':
      return w ? 'images/pieces/white-bishop.png' : 'images/pieces/black-bishop.png';
    case 'R':
      return w ? 'images/pieces/white-rook.png' : 'images/pieces/black-rook.png';
    case 'Q':
      return w ? 'images/pieces/white-queen.png' : 'images/pieces/black-queen.png';
    case 'K':
      return w ? 'images/pieces/white-king.png' : 'images/pieces/black-king.png';
  }
}

export function pieceImageUrl(baseUrl: string, p: Piece, sq?: Square): string {
  return `${baseUrl}${pieceImagePath(p, sq)}`;
}
