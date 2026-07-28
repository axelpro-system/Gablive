import { useEffect, useRef } from 'react';
import './ParticleText.css';

/* ============================================
   PARTICLE TEXT — Canvas 2D particle headline
   that reacts to mouse movement. Lightweight
   (no WebGL/three.js). Respects reduced-motion.
   ============================================ */

const DEFAULTS = {
  color: '#ef2b2d',
  gap: 4, // sampling step in px (smaller = denser = more particles)
  particleSize: 1.8, // radius of each particle
  mouseRadius: 90, // interaction radius in px
  force: 2.4, // repel strength
  returnSpeed: 0.09, // spring back toward home (0..1)
  friction: 0.86, // velocity damping
  fontWeight: 800,
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

export default function ParticleText({
  text,
  height = 96,
  align = 'left',
  ...opts
}) {
  const canvasRef = useRef(null);
  const cfg = { ...DEFAULTS, ...opts };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let particles = [];
    let rafId = null;
    const mouse = { x: -9999, y: -9999 };

    /* Sample the rendered text into particle home positions */
    function build() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(height));

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fit font size to the available height, then shrink to fit width.
      let fontSize = Math.floor(h * 0.82);
      ctx.textBaseline = 'middle';
      const measure = (size) => {
        ctx.font = `${cfg.fontWeight} ${size}px ${cfg.fontFamily}`;
        return ctx.measureText(text).width;
      };
      while (fontSize > 8 && measure(fontSize) > w - 8) {
        fontSize -= 2;
      }

      const textWidth = measure(fontSize);
      const startX =
        align === 'center' ? (w - textWidth) / 2 : align === 'right' ? w - textWidth : 0;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(text, startX, h / 2);

      const img = ctx.getImageData(0, 0, w * dpr, h * dpr).data;
      const step = cfg.gap * dpr;
      const next = [];

      for (let y = 0; y < h * dpr; y += step) {
        for (let x = 0; x < w * dpr; x += step) {
          const alpha = img[(y * w * dpr + x) * 4 + 3];
          if (alpha > 128) {
            const hx = x / dpr;
            const hy = y / dpr;
            next.push({
              hx,
              hy,
              x: prefersReduced ? hx : Math.random() * w,
              y: prefersReduced ? hy : Math.random() * h,
              vx: 0,
              vy: 0,
            });
          }
        }
      }
      particles = next;

      ctx.clearRect(0, 0, w, h);
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = cfg.color;

      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < cfg.mouseRadius) {
          const angle = Math.atan2(dy, dx);
          const push = (cfg.mouseRadius - dist) / cfg.mouseRadius;
          p.vx += Math.cos(angle) * push * cfg.force;
          p.vy += Math.sin(angle) * push * cfg.force;
        }

        // Spring back home
        p.vx += (p.hx - p.x) * cfg.returnSpeed;
        p.vy += (p.hy - p.y) * cfg.returnSpeed;
        p.vx *= cfg.friction;
        p.vy *= cfg.friction;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, cfg.particleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    function drawStatic() {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, height);
      ctx.fillStyle = cfg.color;
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.hx, p.hy, cfg.particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }
    function onPointerLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    build();
    if (prefersReduced) {
      drawStatic();
    } else {
      window.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerleave', onPointerLeave);
      rafId = requestAnimationFrame(draw);
    }

    // Rebuild on resize (debounced)
    let resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        build();
        if (prefersReduced) drawStatic();
      }, 150);
    }
    window.addEventListener('resize', onResize);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [text, height, align]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-text"
      style={{ height: `${height}px` }}
      role="img"
      aria-label={text}
    />
  );
}
