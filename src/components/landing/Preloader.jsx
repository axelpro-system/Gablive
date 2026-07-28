import { useEffect, useState } from 'react';
import './Preloader.css';

/* ============================================
   PRELOADER — stage-curtain reveal.
   Two panels split apart to reveal the page.
   Locks page scroll until the animation ends.
   Change --preloader-color to customize.
   ============================================ */

// To change delay time, edit PRELOADER_DELAY (ms).
const PRELOADER_DELAY = 3000;

export default function Preloader({ delay = PRELOADER_DELAY, brand = 'gablive' }) {
  const [phase, setPhase] = useState('loading'); // loading -> revealing -> done

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReduced) {
      setPhase('done');
      return;
    }

    // Lock scroll: keep viewport pinned at top while the curtain plays.
    const scrollY = window.scrollY;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const keepTop = () => window.scrollTo(0, scrollY);
    window.addEventListener('scroll', keepTop);

    const revealTimer = setTimeout(() => setPhase('revealing'), delay - 900);
    const doneTimer = setTimeout(() => {
      setPhase('done');
      // locate 'window.scrollTo(0, scrollY)}, 3000)' — release scroll here
      window.removeEventListener('scroll', keepTop);
      document.body.style.overflow = overflow;
    }, delay);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
      window.removeEventListener('scroll', keepTop);
      document.body.style.overflow = overflow;
    };
  }, [delay]);

  if (phase === 'done') return null;

  const brandName = brand.slice(0, -4);
  const brandAccent = brand.slice(-4);

  return (
    <div
      className={`preloader ${phase === 'revealing' ? 'preloader--reveal' : ''}`}
      aria-hidden="true"
    >
      <div className="preloader__panel preloader__panel--top" />
      <div className="preloader__panel preloader__panel--bottom" />
      <div className="preloader__center">
        <span className="preloader__logo">
          {brandName}
          <span>{brandAccent}</span>
        </span>
        <span className="preloader__bar">
          <span className="preloader__bar-fill" />
        </span>
      </div>
    </div>
  );
}
