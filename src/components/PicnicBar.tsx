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

export function PicnicBar() {
  const [drink, setDrink] = useState<(typeof DRINKS)[number]['id']>(() => pick(DRINKS));
  const [snack, setSnack] = useState<(typeof SNACKS)[number]['id']>(() => pick(SNACKS));
  const [vibe, setVibe] = useState<(typeof VIBES)[number]['id']>(() => pick(VIBES));

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

      <div className="picnic__controls">
        <label className="picnic__control">
          <span className="section-subtitle">Drink</span>
          <select value={drink} onChange={(e) => setDrink(e.target.value as typeof drink)}>
            {DRINKS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="picnic__control">
          <span className="section-subtitle">Snack</span>
          <select value={snack} onChange={(e) => setSnack(e.target.value as typeof snack)}>
            {SNACKS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="picnic__control">
          <span className="section-subtitle">Vibe</span>
          <select value={vibe} onChange={(e) => setVibe(e.target.value as typeof vibe)}>
            {VIBES.map((x) => (
              <option key={x.id} value={x.id}>
                {x.emoji} {x.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

