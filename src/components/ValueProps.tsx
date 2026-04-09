const items = [
  'Advanced-beginner friendly: know the rules (or we’ll teach you), no rating required.',
  'Takebacks, friendly post-mortems, and “wait let’s replay from move 12” — if you both want to.',
  'Bits over brutality: “don’t take my horse, I love him” is valid table talk.',
  'Co-op energy: make the game more interesting together, not just extract a W.',
];

export function ValueProps() {
  return (
    <section aria-labelledby="values-heading">
      <h2 id="values-heading" className="section-title">
        What this is
      </h2>
      <ul className="pillars">
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
