const items = [
  'For advanced beginners: you know the rules (or we’ll gently teach you). Ratings optional, tea encouraged.',
  'Takebacks, giggly post-mortems, “pause — let’s try that again from here” when you both feel like it.',
  'Flair over fear: “please don’t take Kevin, he’s sensitive” is legitimate negotiation.',
  'Co-op sparkle: conspire to make the position silly, not just to grind out a win.',
];

export function ValueProps() {
  return (
    <section aria-labelledby="values-heading">
      <h2 id="values-heading" className="section-title">
        House rules, loosely
      </h2>
      <ul className="pillars">
        {items.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
