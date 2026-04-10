import { useState } from 'react';

const DRINKS = [
  { id: 'wine', label: 'wine', emoji: '🍷' },
  { id: 'tea', label: 'tea', emoji: '🫖' },
  { id: 'coffee', label: 'coffee', emoji: '☕️' },
  { id: 'sparkling', label: 'sparkly', emoji: '🥂' },
  { id: 'juice', label: 'juice', emoji: '🧃' },
] as const;

const SNACKS = [
  { id: 'berries', label: 'berries', emoji: '🍓' },
  { id: 'cake', label: 'cake', emoji: '🍰' },
  { id: 'cheese', label: 'cheese', emoji: '🧀' },
  { id: 'olives', label: 'olives', emoji: '🫒' },
] as const;

const VIBES = [
  { id: 'silly', label: 'silly', emoji: '😜' },
  { id: 'focused', label: 'focused', emoji: '🎧' },
  { id: 'curious', label: 'curious', emoji: '🔎' },
] as const;

function pick<T extends readonly { id: string }[]>(arr: T): T[number]['id'] {
  const i = Math.floor(Math.random() * arr.length);
  return arr[i]!.id;
}

function cycleNext<T extends readonly { id: string }[]>(
  arr: T,
  current: T[number]['id'],
  set: (id: T[number]['id']) => void,
) {
  const i = arr.findIndex((x) => x.id === current);
  const next = arr[(i + 1) % arr.length]!;
  set(next.id);
}

export function PicnicBar() {
  const [drink, setDrink] = useState<(typeof DRINKS)[number]['id']>(() => pick(DRINKS));
  const [snack, setSnack] = useState<(typeof SNACKS)[number]['id']>(() => pick(SNACKS));
  const [vibe, setVibe] = useState<(typeof VIBES)[number]['id']>(() => pick(VIBES));

  const drinkItem = DRINKS.find((x) => x.id === drink)!;
  const snackItem = SNACKS.find((x) => x.id === snack)!;
  const vibeItem = VIBES.find((x) => x.id === vibe)!;

  return (
    <section className="picnic" aria-labelledby="picnic-bar-heading">
      <div className="picnic__header">
        <h2 id="picnic-bar-heading" className="section-title picnic__title">
          Set the scene
        </h2>
        <button
          type="button"
          className="picnic__reroll"
          onClick={() => {
            setDrink(pick(DRINKS));
            setSnack(pick(SNACKS));
            setVibe(pick(VIBES));
          }}
        >
          reroll ✶
        </button>
      </div>

      <p className="picnic__scene" role="group" aria-label="Picnic choices. Tap each to change.">
        <button
          type="button"
          className="picnic__pick"
          onClick={() => cycleNext(DRINKS, drink, setDrink)}
          title={`${drinkItem.label} — tap for next`}
          aria-label={`Drink: ${drinkItem.label}. Tap to change.`}
        >
          <span className="picnic__pick-label">drink</span>
          <span className="picnic__pick-emoji" aria-hidden>
            {drinkItem.emoji}
          </span>
        </button>
        <span className="picnic__sep" aria-hidden>
          +
        </span>
        <button
          type="button"
          className="picnic__pick"
          onClick={() => cycleNext(SNACKS, snack, setSnack)}
          title={`${snackItem.label} — tap for next`}
          aria-label={`Snack: ${snackItem.label}. Tap to change.`}
        >
          <span className="picnic__pick-label">snack</span>
          <span className="picnic__pick-emoji" aria-hidden>
            {snackItem.emoji}
          </span>
        </button>
        <span className="picnic__sep" aria-hidden>
          +
        </span>
        <button
          type="button"
          className="picnic__pick"
          onClick={() => cycleNext(VIBES, vibe, setVibe)}
          title={`${vibeItem.label} — tap for next`}
          aria-label={`Vibe: ${vibeItem.label}. Tap to change.`}
        >
          <span className="picnic__pick-label">vibe</span>
          <span className="picnic__pick-emoji" aria-hidden>
            {vibeItem.emoji}
          </span>
        </button>
      </p>
    </section>
  );
}

