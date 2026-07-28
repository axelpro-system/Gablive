import { useEffect, useState } from 'react';
import './Typewriter.css';

/* ============================================
   TYPEWRITER — types/deletes a list of words
   in a loop. Respects reduced-motion (shows the
   first word statically).
   ============================================ */

export default function Typewriter({
  words = [],
  typeSpeed = 90,
  deleteSpeed = 45,
  pause = 1600,
}) {
  const [display, setDisplay] = useState('');
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  useEffect(() => {
    if (reduced || words.length === 0) return;

    const current = words[index % words.length];
    let delay = deleting ? deleteSpeed : typeSpeed;

    if (!deleting && display === current) {
      delay = pause; // hold full word
    } else if (deleting && display === '') {
      setDeleting(false);
      setIndex((i) => (i + 1) % words.length);
      delay = typeSpeed;
    }

    const timer = setTimeout(() => {
      if (!deleting && display === current) {
        setDeleting(true);
      } else {
        const next = deleting
          ? current.slice(0, display.length - 1)
          : current.slice(0, display.length + 1);
        setDisplay(next);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [display, deleting, index, reduced, words, typeSpeed, deleteSpeed, pause]);

  if (reduced) {
    return <span className="typewriter">{words[0] || ''}</span>;
  }

  return (
    <span className="typewriter">
      {display}
      <span className="typewriter__caret" aria-hidden="true" />
    </span>
  );
}
