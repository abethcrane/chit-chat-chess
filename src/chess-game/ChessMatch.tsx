import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chooseAiMove, type AiDifficulty } from './ai/search';
import {
  ALL_PIECE_TYPES,
  type Color,
  type GameState,
  type Move,
  type Piece,
  type PieceType,
  type Square,
} from './core/types';
import { fileOf, rankOf, square, toAlgebraic } from './core/types';
import { pieceAt as at } from './core/board';
import { createGame, evaluateOutcome, outcomeAfterMove, tryApplyMove } from './core/game';
import { explainSquare } from './core/explain';
import { getCapturedPiece, legalMovesFrom } from './core/moves';
import { PIECE_HEIGHT_RATIO, pieceImageUrl, pieceTypeTogglePath } from './pieceArt';

const CAPTURE_SORT: PieceType[] = ['Q', 'R', 'B', 'N', 'P'];

function playOut(start: GameState, moves: readonly Move[]): GameState {
  let g = start;
  for (const m of moves) {
    const n = tryApplyMove(g, m);
    if (!n) break;
    g = n;
  }
  return g;
}

function sortCaptured(list: Piece[]): Piece[] {
  return [...list].sort(
    (a, b) => CAPTURE_SORT.indexOf(a.type) - CAPTURE_SORT.indexOf(b.type) || a.type.localeCompare(b.type),
  );
}

const PIECE_TOGGLE_ARIA: Record<PieceType, string> = {
  K: 'King — always on the board',
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  P: 'Pawn',
};

/**
 * Map screen cell to square. Human’s pieces sit on the bottom row; files mirror for Black
 * (h-file on the left) like a typical chess UI.
 */
function visualToSquare(file: number, rankFromTop: number, human: Color): Square {
  const rank = human === 'w' ? 7 - rankFromTop : rankFromTop;
  const f = human === 'w' ? file : 7 - file;
  return square(f, rank);
}

function pickMoveForDestination(state: GameState, from: Square, to: Square): Move | null {
  const opts = legalMovesFrom(state, from).filter((m) => m.to === to);
  if (opts.length === 0) return null;
  const q = opts.find((o) => o.promotion === 'Q');
  return q ?? opts[0]!;
}

function isCastleMove(prev: GameState, move: Move): boolean {
  const p = prev.board[move.from];
  if (!p || p.type !== 'K') return false;
  return Math.abs(fileOf(move.to) - fileOf(move.from)) === 2;
}

function isEnPassantMove(prev: GameState, move: Move): boolean {
  const p = prev.board[move.from];
  if (!p || p.type !== 'P') return false;
  return move.to === prev.epSquare && !prev.board[move.to];
}

const SS_CASTLE = 'ccc_taught_castle';
const SS_EP = 'ccc_taught_ep';

export type ChessMatchProps = {
  enabledTypes?: Set<PieceType>;
  onEnabledTypesChange?: (next: Set<PieceType>) => void;
};

export function ChessMatch({ enabledTypes: controlledEnabled, onEnabledTypesChange }: ChessMatchProps = {}) {
  const base = import.meta.env.BASE_URL;
  const [localEnabled, setLocalEnabled] = useState<Set<PieceType>>(() => new Set(ALL_PIECE_TYPES));
  const enabledTypes = controlledEnabled ?? localEnabled;
  const setEnabledTypes = onEnabledTypesChange ?? setLocalEnabled;
  const [vsAi, setVsAi] = useState(true);
  const [humanColor, setHumanColor] = useState<Color>(() => (Math.random() < 0.5 ? 'w' : 'b'));
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [training, setTraining] = useState(true);
  const [start, setStart] = useState<GameState>(() => {
    const s = new Set(ALL_PIECE_TYPES);
    return createGame(s);
  });
  const [moveLog, setMoveLog] = useState<Move[]>([]);
  const startRef = useRef(start);
  startRef.current = start;

  const game = useMemo(() => playOut(start, moveLog), [start, moveLog]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [hoverSq, setHoverSq] = useState<Square | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [hoverExplain, setHoverExplain] = useState<string | null>(null);
  const bannerTimer = useRef<number | null>(null);

  const aiColor: Color = humanColor === 'w' ? 'b' : 'w';

  const outcome = useMemo(() => evaluateOutcome(game), [game]);

  const capturePiles = useMemo(() => {
    const whitePieces: Piece[] = [];
    const blackPieces: Piece[] = [];
    let g = start;
    for (const m of moveLog) {
      const cap = getCapturedPiece(g, m);
      if (cap) {
        if (cap.color === 'w') whitePieces.push(cap);
        else blackPieces.push(cap);
      }
      const n = tryApplyMove(g, m);
      if (!n) break;
      g = n;
    }
    return { whitePieces: sortCaptured(whitePieces), blackPieces: sortCaptured(blackPieces) };
  }, [start, moveLog]);

  const beginNewGame = useCallback(
    (randomizeColor: boolean) => {
      const set = new Set(enabledTypes);
      set.add('K');
      try {
        const g = createGame(set);
        setStart(g);
        setMoveLog([]);
        setSelected(null);
        setHoverSq(null);
        setBanner(null);
        setHoverExplain(null);
        if (randomizeColor && vsAi) {
          setHumanColor(Math.random() < 0.5 ? 'w' : 'b');
        }
      } catch {
        setBanner('Need both kings — enable the king for each side.');
      }
    },
    [enabledTypes, vsAi],
  );

  /** When the piece-type set changes, start a fresh standard position (same color) so the board matches the toggles. */
  const pieceSetSigRef = useRef<string | null>(null);
  useEffect(() => {
    const sig = [...enabledTypes].sort().join('');
    if (pieceSetSigRef.current === null) {
      pieceSetSigRef.current = sig;
      return;
    }
    if (pieceSetSigRef.current === sig) return;
    pieceSetSigRef.current = sig;
    beginNewGame(false);
  }, [enabledTypes, beginNewGame]);

  const undo = useCallback(() => {
    setMoveLog((log) => {
      if (log.length === 0) return log;
      if (!vsAi) return log.slice(0, -1);
      const st = startRef.current;
      const g = playOut(st, log);
      if (g.toMove === aiColor) return log.slice(0, -1);
      if (log.length >= 2) return log.slice(0, -2);
      return log.slice(0, -1);
    });
    setSelected(null);
    setHoverSq(null);
    setHoverExplain(null);
  }, [vsAi, aiColor]);

  const showBanner = useCallback((msg: string, ms = 3200) => {
    setBanner(msg);
    if (bannerTimer.current) window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  const toggleType = (t: PieceType) => {
    if (t === 'K') return;
    const prev = enabledTypes;
    const next = new Set(prev);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setEnabledTypes(next);
  };

  const onSquareClick = (sq: Square) => {
    if (outcome.phase !== 'playing') return;
    if (vsAi && game.toMove !== humanColor) return;

    const piece = at(game, sq);
    if (selected === null) {
      if (piece && piece.color === game.toMove) {
        setSelected(sq);
      }
      return;
    }

    if (selected === sq) {
      setSelected(null);
      return;
    }

    const move = pickMoveForDestination(game, selected, sq);
    if (!move) {
      if (piece && piece.color === game.toMove) {
        setSelected(sq);
      }
      return;
    }

    const prev = game;
    const applied = tryApplyMove(prev, move);
    if (!applied) return;

    const oc = outcomeAfterMove(prev, move);

    if (isCastleMove(prev, move) && sessionStorage.getItem(SS_CASTLE) !== '1') {
      sessionStorage.setItem(SS_CASTLE, '1');
      showBanner('Castling — king and rook both move for the first time this game. The king jumps two squares toward the rook.', 5200);
    } else if (isEnPassantMove(prev, move) && sessionStorage.getItem(SS_EP) !== '1') {
      sessionStorage.setItem(SS_EP, '1');
      showBanner('En passant — you capture the pawn that just dashed past, as if it only moved one square.', 5200);
    }

    if (oc.phase === 'playing' && oc.sideInCheck) {
      const checked = oc.sideInCheck;
      showBanner(`${checked === 'w' ? 'White' : 'Black'} is in check.`, 2800);
    }

    setMoveLog((log) => [...log, move]);
    setSelected(null);
    setHoverExplain(null);

    if (oc.phase === 'checkmate') {
      showBanner(`Checkmate — ${oc.winner === 'w' ? 'White' : 'Black'} wins.`, 6000);
    } else if (oc.phase === 'stalemate') {
      showBanner('Stalemate — draw.', 4000);
    } else if (oc.phase === 'draw') {
      showBanner('Draw (fifty-move rule).', 4000);
    }
  };

  useEffect(() => {
    if (!vsAi) return;
    if (game.toMove !== aiColor) return;
    const oc = evaluateOutcome(game);
    if (oc.phase !== 'playing') return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setMoveLog((log) => {
        const st = startRef.current;
        let g = st;
        for (const mv of log) {
          const n = tryApplyMove(g, mv);
          if (!n) return log;
          g = n;
        }
        if (g.toMove !== aiColor) return log;
        const oc2 = evaluateOutcome(g);
        if (oc2.phase !== 'playing') return log;
        const m = chooseAiMove(g, aiColor, aiDifficulty);
        if (!m) return log;
        const next = tryApplyMove(g, m);
        if (!next) return log;

        const ocn = outcomeAfterMove(g, m);
        if (ocn.phase === 'playing' && ocn.sideInCheck) {
          const checked = ocn.sideInCheck;
          window.setTimeout(() => {
            showBanner(`${checked === 'w' ? 'White' : 'Black'} is in check.`, 2800);
          }, 0);
        }
        if (ocn.phase === 'checkmate') {
          window.setTimeout(() => showBanner(`Checkmate — ${ocn.winner === 'w' ? 'White' : 'Black'} wins.`, 6000), 0);
        }
        return [...log, m];
      });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [game, vsAi, aiColor, aiDifficulty, showBanner]);

  const legalDests = useMemo(() => {
    if (!training || selected === null || outcome.phase !== 'playing') return new Set<Square>();
    if (game.toMove !== humanColor && vsAi) return new Set<Square>();
    return new Set(legalMovesFrom(game, selected).map((m) => m.to));
  }, [training, selected, game, outcome.phase, humanColor, vsAi]);

  useEffect(() => {
    if (!training || selected === null) {
      setHoverExplain(null);
      return;
    }
    const selectedHint =
      'Piece selected. Highlighted squares are legal moves — hover one for details, or hover elsewhere to see why it’s not a legal destination.';
    // Keep a line of copy whenever something is selected so the panel height doesn’t jump.
    if (hoverSq === null || hoverSq === selected) {
      setHoverExplain(selectedHint);
      return;
    }
    const ex = explainSquare(game, selected, hoverSq);
    setHoverExplain(ex.text);
  }, [training, selected, hoverSq, game]);

  const turnLabel =
    outcome.phase === 'playing'
      ? `${game.toMove === 'w' ? 'White' : 'Black'} to move`
      : outcome.phase === 'checkmate'
        ? 'Checkmate'
        : outcome.phase === 'stalemate'
          ? 'Stalemate'
          : 'Draw';

  return (
    <div className="chess-match">
      <div className="chess-match__toolbar">
        <div className="chess-match__toggles" aria-label="Pieces on the board">
          {ALL_PIECE_TYPES.map((t) => {
            const on = t === 'K' || enabledTypes.has(t);
            return (
              <label
                key={t}
                className={[
                  'chess-match__piece-toggle',
                  on ? 'chess-match__piece-toggle--on' : 'chess-match__piece-toggle--off',
                  t === 'K' ? 'chess-match__piece-toggle--king' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={on}
                  disabled={t === 'K'}
                  onChange={() => toggleType(t)}
                  aria-label={PIECE_TOGGLE_ARIA[t]}
                />
                <span className="chess-match__piece-toggle-face" aria-hidden="true">
                  <img src={`${base}${pieceTypeTogglePath(t)}`} alt="" width={44} height={44} />
                </span>
                <span className="chess-match__piece-toggle-name">{t === 'K' ? 'King' : t}</span>
              </label>
            );
          })}
        </div>
        <div className="chess-match__row">
          <label className="chess-match__inline">
            <input type="checkbox" checked={vsAi} onChange={(e) => setVsAi(e.target.checked)} />
            Play vs AI
          </label>
          {vsAi ? (
            <>
              <label className="chess-match__inline">
                You are{' '}
                <select value={humanColor} onChange={(e) => setHumanColor(e.target.value as Color)}>
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </label>
              <label className="chess-match__inline">
                Difficulty{' '}
                <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value as AiDifficulty)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </>
          ) : null}
          <label className="chess-match__inline">
            <input type="checkbox" checked={training} onChange={(e) => setTraining(e.target.checked)} />
            Training highlights
          </label>
          <button type="button" className="chess-match__btn" onClick={() => beginNewGame(false)}>
            Reset board
          </button>
          {vsAi ? (
            <button type="button" className="chess-match__btn chess-match__btn--ghost" onClick={() => beginNewGame(true)}>
              Reset board · random side
            </button>
          ) : null}
          <button type="button" className="chess-match__btn" onClick={undo} disabled={moveLog.length === 0}>
            Undo
          </button>
        </div>
        <p className="chess-match__status">
          {turnLabel}
          {vsAi ? (
            <span className="chess-match__you">
              {' '}
              — You are {humanColor === 'w' ? 'White' : 'Black'}
            </span>
          ) : null}
        </p>
      </div>

      <div className="chess-match__arena">
        <aside
          className="chess-match__graveyard chess-match__graveyard--white"
          aria-label="Captured white pieces"
        >
          {capturePiles.whitePieces.map((p, i) => (
            <div
              key={`w-${i}-${p.type}`}
              className="chess-match__grave-piece"
              style={{ ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]) }}
            >
              <img src={pieceImageUrl(base, p, square(0, 0))} alt="" />
            </div>
          ))}
        </aside>

        <div className="chess-match__board-only">
          <div className="chess-board" role="grid" aria-label="Chess board">
            {Array.from({ length: 8 }, (_, rankFromTop) => (
              <div key={rankFromTop} className="chess-board__rank" role="row">
                {Array.from({ length: 8 }, (_, file) => {
                  const sq = visualToSquare(file, rankFromTop, humanColor);
                  // FIDE: nearest corner to each player is a light square → h1 & a8 light; a1 & h8 dark.
                  const light = (fileOf(sq) + rankOf(sq)) % 2 === 1;
                  const p = game.board[sq];
                  const isSel = selected === sq;
                  const isLegal = legalDests.has(sq);
                  const isLegalCapture = isLegal && p && p.color !== game.toMove;
                  const isLegalQuiet = isLegal && !isLegalCapture;
                  const isHover = hoverSq === sq;
                  return (
                    <button
                      key={sq}
                      type="button"
                      role="gridcell"
                      aria-label={`${toAlgebraic(sq)}${p ? ` ${p.color} ${p.type}` : ' empty'}`}
                      className={[
                        'chess-board__sq',
                        light ? 'chess-board__sq--light' : 'chess-board__sq--dark',
                        isSel ? 'chess-board__sq--selected' : '',
                        isLegal ? 'chess-board__sq--legal' : '',
                        isLegalQuiet ? 'chess-board__sq--legal-quiet' : '',
                        isLegalCapture ? 'chess-board__sq--legal-capture' : '',
                        isHover ? 'chess-board__sq--hover' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onSquareClick(sq)}
                      onMouseEnter={() => setHoverSq(sq)}
                      onMouseLeave={() => setHoverSq(null)}
                    >
                      {p ? (
                        <img
                          className="chess-board__piece"
                          src={pieceImageUrl(base, p, sq)}
                          alt=""
                          style={{ ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]) }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <aside
          className="chess-match__graveyard chess-match__graveyard--black"
          aria-label="Captured black pieces"
        >
          {capturePiles.blackPieces.map((p, i) => (
            <div
              key={`b-${i}-${p.type}`}
              className="chess-match__grave-piece"
              style={{ ['--ph' as string]: String(PIECE_HEIGHT_RATIO[p.type]) }}
            >
              <img src={pieceImageUrl(base, p, square(0, 0))} alt="" />
            </div>
          ))}
        </aside>
      </div>

      {banner || (training && selected !== null) ? (
        <div className="chess-match__foot">
          {banner ? (
            <div className="chess-match__banner chess-match__banner--under-board" role="status">
              {banner}
            </div>
          ) : null}
          {training && selected !== null ? (
            <div className="chess-match__explain-slot">
              <p className="chess-match__explain">{hoverExplain}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
