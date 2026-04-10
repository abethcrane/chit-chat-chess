import { useMemo, useState } from 'react';
import { ALL_PIECE_TYPES, ChessMatch, composeInstructionSections, type PieceType } from './chess-game';
import { Hero } from './components/Hero';
import { HouseRules } from './components/HouseRules';
import { PicnicBar } from './components/PicnicBar';
import { RulesPlayfield } from './components/RulesPlayfield';
import { SiteBanner } from './components/SiteBanner';
import { SiteFooter } from './components/SiteFooter.tsx';
import { PageBoardDancers } from './components/PageBoardDancers';
import { VibePanel } from './components/VibePanel';

const shellStyle = {
  ['--shell-art' as string]: `url("${import.meta.env.BASE_URL}images/alice-john-tenniel/chessboard-through-the-looking-glass-john-tenniel.jpg")`,
};

export function App() {
  const [enabledPieceTypes, setEnabledPieceTypes] = useState<Set<PieceType>>(
    () => new Set(ALL_PIECE_TYPES),
  );
  const instructionSections = useMemo(
    () => composeInstructionSections(enabledPieceTypes),
    [enabledPieceTypes],
  );

  return (
    <div className="shell" style={shellStyle}>
      <SiteBanner />
      <div className="page page--board">
        <PageBoardDancers />
        <div className="page--board__inner">
        <Hero />
        <HouseRules />
        <PicnicBar />
        <section className="panel panel--rose" aria-labelledby="learn-heading">
          <h2 id="learn-heading" className="section-title">
            Learn the pieces, then play
          </h2>
          <p className="section-lede">
            Toggle which pieces are in play, use <strong>Undo</strong> to step back, and <strong>Reset board</strong> to
            start fresh without changing your color. Training mode highlights legal moves and explains hovers. The board
            turns so you’re always at the bottom.
          </p>
          <ChessMatch enabledTypes={enabledPieceTypes} onEnabledTypesChange={setEnabledPieceTypes} />
        </section>
        <section className="panel panel--rose" aria-labelledby="playfield-heading">
          <h2 id="playfield-heading" className="section-title">
            How the enabled pieces move
          </h2>
          <RulesPlayfield instructionSections={instructionSections} />
        </section>
        <VibePanel />
        <section className="cta" aria-labelledby="cta-heading">
          <h2 id="cta-heading">Want in?</h2>
          <p>We’re still setting up the table. Check back soon!</p>
        </section>
        <SiteFooter />
        </div>
      </div>
    </div>
  );
}
