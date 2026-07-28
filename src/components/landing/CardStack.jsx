import './CardStack.css';

/* ============================================
   CARD STACK — sticky scroll-stacking cards.
   Each card pins and the next slides over it,
   creating a premium stacking effect on scroll.
   ============================================ */

/**
 * @param {object} props
 * @param {Array<any>} props.items          Data for each card
 * @param {(item: any, index: number) => React.ReactNode} props.renderCard
 * @param {number} [props.topOffset]        Sticky offset from top (px)
 * @param {number} [props.step]             Stagger per card (px)
 */
export default function CardStack({ items, renderCard, topOffset = 120, step = 16 }) {
  return (
    <div className="card-stack">
      {items.map((item, i) => (
        <div
          className="card-stack__item"
          key={i}
          style={{
            top: `${topOffset + i * step}px`,
            zIndex: i + 1,
          }}
        >
          {renderCard(item, i)}
        </div>
      ))}
    </div>
  );
}
