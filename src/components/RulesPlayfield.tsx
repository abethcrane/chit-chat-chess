import { useMemo } from 'react';
import { type InstructionSection, pieceTypeTogglePath } from '../chess-game';
import { attribution } from '../content/chessFlourish';

export type RulesPlayfieldProps = {
  instructionSections: InstructionSection[];
};

function InstructionBody({ sections, baseUrl }: { sections: InstructionSection[]; baseUrl: string }) {
  if (sections.length === 0) {
    return (
      <p className="instruction-sheet__empty">Enable at least one piece type above to see how it moves.</p>
    );
  }
  return (
    <>
      {sections.map((s) => (
        <section key={s.id} className="instruction-sheet__block">
          <div className="instruction-sheet__heading-row">
            <img
              className="instruction-sheet__piece-thumb"
              src={`${baseUrl}${pieceTypeTogglePath(s.id)}`}
              alt=""
              width={40}
              height={40}
            />
            <h4 className="instruction-sheet__title">{s.title}</h4>
          </div>
          <ul className="instruction-sheet__list">
            {s.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function RulesPlayfield({ instructionSections }: RulesPlayfieldProps) {
  const baseUrl = import.meta.env.BASE_URL;
  const plainSr = useMemo(
    () =>
      instructionSections.map((s) => `${s.title}: ${s.bullets.join('; ')}`).join(' ') + ` ${attribution}`,
    [instructionSections],
  );

  return (
    <div className="playfield-wrap">
      <p className="sr-only">{plainSr}</p>
      <div className="instruction-sheet instruction-sheet--solo">
        <InstructionBody sections={instructionSections} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
