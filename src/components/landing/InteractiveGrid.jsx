import { useEffect, useRef } from 'react';
import './InteractiveGrid.css';

/* ============================================
   INTERACTIVE GRID — animated dotted grid that
   reacts to the cursor in real time. Canvas 2D,
   sits behind hero content. Respects reduced-motion.
   ============================================ */

const DEFAULTS = {
  cell: 34, // grid spacing in px
  dotSize: 1.4, // base dot radius
  color: '239, 43, 45', // brand red as "r, g, b"
  baseAlpha: 0.16,
  glowRadius: 130, // cursor influence radius
};

export default function InteractiveGrid(opts = {}) {
  const canvasRef = useRef(null);
  const cfg = { ...DEFAULTS, ...opts };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let rafId = null;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame() {
      ctx.clearRect(0, 0, width, height);
      const { cell, dotSize, color, baseAlpha, glowRadius } = cfg;

      for (let x = cell / 2; x < width; x += cell) {
        for (let y = cell / 2; y < height; y += cell) {
          let alpha = baseAlpha;
          let size = dotSize;

          if (mouse.x > -9998) {
            const dist = Math.hypot(x - mouse.x, y - mouse.y);
            if (dist < glowRadius) {
              const t = 1 - dist / glowRadius;
              alpha = baseAlpha + t * 0.7;
              size = dotSize + t * 2.4;
            }
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      rafId = requestAnimationFrame(drawFrame);
    }

    function drawStatic() {
      ctx.clearRect(0, 0, width, height);
      const { cell, dotSize, color, baseAlpha } = cfg;
      ctx.fillStyle = `rgba(${color}, ${baseAlpha})`;
      for (let x = cell / 2; x < width; x += cell) {
        for (let y = cell / 2; y < height; y += cell) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    resize();

    if (prefersReduced) {
      drawStatic();
    } else {
      window.addEventListener('pointermove', onMove);
      rafId = requestAnimationFrame(drawFrame);
    }

    let resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (prefersReduced) drawStatic();
      }, 150);
    }
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerleave', onLeave);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="interactive-grid" aria-hidden="true" />;
}
