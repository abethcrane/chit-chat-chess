import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chooseAiMove, type AiDifficulty } from './ai/search';
import { ALL_PIECE_TYPES, type Color, type GameState, type Move, type PieceType, type Square } from './core/types';
import { fileOf, square, toAlgebraic } from './core/types';
import { pieceAt as at } from './core/board';
import { createGame, evaluateOutcome, outcomeAfterMove, tryApplyMove } from './core/game';
import { explainSquare } from './core/explain';
import { legalMovesFrom } from './core/moves';
import { pieceImageUrl } from './pieceArt';

function visualToSquare(file: number, rankFromTop: number): Square {
  const rank = 7 - rankFromTop;
  return square(file, rank);
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
  const [game, setGame] = useState<GameState>(() => createGame(new Set(ALL_PIECE_TYPES)));
  const [selected, setSelected] = useState<Square | null>(null);
  const [hoverSq, setHoverSq] = useState<Square | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [hoverExplain, setHoverExplain] = useState<string | null>(null);
  const bannerTimer = useRef<number | null>(null);

  const aiColor: Color = humanColor === 'w' ? 'b' : 'w';

  const outcome = useMemo(() => evaluateOutcome(game), [game]);

  const startNewGame = useCallback(() => {
    const set = new Set(enabledTypes);
    set.add('K');
    try {
      const g = createGame(set);
      setGame(g);
      setSelected(null);
      setHoverSq(null);
      setBanner(null);
      setHoverExplain(null);
      if (vsAi) {
        setHumanColor(Math.random() < 0.5 ? 'w' : 'b');
      }
    } catch {
      setBanner('Need both kings — enable the king for each side.');
    }
  }, [enabledTypes, vsAi]);

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

    setGame(applied);
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
      setGame((g) => {
        if (g.toMove !== aiColor) return g;
        const oc2 = evaluateOutcome(g);
        if (oc2.phase !== 'playing') return g;
        const m = chooseAiMove(g, aiColor, aiDifficulty);
        if (!m) return g;
        const prev = g;
        const next = tryApplyMove(g, m);
        if (!next) return g;

        const ocn = outcomeAfterMove(prev, m);
        if (ocn.phase === 'playing' && ocn.sideInCheck) {
          const checked = ocn.sideInCheck;
          window.setTimeout(() => {
            showBanner(`${checked === 'w' ? 'White' : 'Black'} is in check.`, 2800);
          }, 0);
        }
        if (ocn.phase === 'checkmate') {
          window.setTimeout(() => showBanner(`Checkmate — ${ocn.winner === 'w' ? 'White' : 'Black'} wins.`, 6000), 0);
        }
        return next;
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
    if (!training || selected === null || hoverSq === null) {
      setHoverExplain(null);
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
          {ALL_PIECE_TYPES.map((t) => (
            <label key={t} className="chess-match__toggle">
              <input
                type="checkbox"
                checked={t === 'K' || enabledTypes.has(t)}
                disabled={t === 'K'}
                onChange={() => toggleType(t)}
              />
              <span>{t === 'K' ? 'King (always)' : t}</span>
            </label>
          ))}
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
          <button type="button" className="chess-match__btn" onClick={startNewGame}>
            New game {vsAi ? '(flip color)' : ''}
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

      {banner ? (
        <div className="chess-match__banner" role="status">
          {banner}
        </div>
      ) : null}

      <div className="chess-match__board-wrap">
        <div className="chess-board" role="grid" aria-label="Chess board">
          {Array.from({ length: 8 }, (_, rankFromTop) => (
            <div key={rankFromTop} className="chess-board__rank" role="row">
              {Array.from({ length: 8 }, (_, file) => {
                const sq = visualToSquare(file, rankFromTop);
                const light = (file + rankFromTop) % 2 === 0;
                const p = game.board[sq];
                const isSel = selected === sq;
                const isLegal = legalDests.has(sq);
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
                        src={pieceImageUrl(base, p)}
                        alt=""
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {training && hoverExplain && selected !== null ? (
          <p className="chess-match__explain">{hoverExplain}</p>
        ) : null}
      </div>
    </div>
  );
}
