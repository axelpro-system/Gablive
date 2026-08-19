import { useEffect, useRef, useState } from 'react';
import './CinemaScreenVideo.css';

/**
 * Gera um `clip-path: path()` com bordas curvas (quadráticas) e cantos arredondados.
 *
 * Cada aresta usa um ponto de controle no ponto médio:
 *  - concave (padrão): controle "puxa para dentro" da caixa (tela de cinema curva)
 *  - convex:  controle "empurra para fora" (efeito barril/pílula)
 *
 * @param {number} W largura em px
 * @param {number} H altura em px
 * @param {'concave'|'convex'} shape
 * @param {number} curveVpx deslocamento vertical das arestas laterais (px)
 * @param {number} curveHpx deslocamento horizontal das arestas de topo/base (px)
 * @param {number} r raio de canto (px)
 * @returns {string} valor pronto para `clip-path: path(...)`
 */
export function buildCinemaPath(W, H, shape, curveVpx, curveHpx, r) {
  const inward = shape === 'convex' ? -1 : 1;
  const c = Math.min(r, W / 2, H / 2);

  const leftX = inward * curveVpx;        // +x puxa a aresta esquerda para dentro
  const rightX = W - inward * curveVpx;   // −x puxa a aresta direita para dentro
  const topY = inward * curveHpx;         // +y (para baixo) curva o topo para dentro
  const bottomY = H - inward * curveHpx;  // −y curva a base para dentro

  return [
    `M ${c} 0`,
    `Q ${W / 2} ${topY} ${W - c} 0`,          // topo
    `Q ${W} 0 ${W} ${c}`,                     // canto superior direito
    `Q ${rightX} ${H / 2} ${W} ${H - c}`,     // direita
    `Q ${W} ${H} ${W - c} ${H}`,              // canto inferior direito
    `Q ${W / 2} ${bottomY} ${c} ${H}`,        // base
    `Q 0 ${H} 0 ${H - c}`,                    // canto inferior esquerdo
    `Q ${leftX} ${H / 2} 0 ${c}`,             // esquerda
    `Q 0 0 ${c} 0`,                           // canto superior esquerdo
    'Z',
  ].join(' ');
}

const DEFAULTS = {
  shape: 'concave',
  curveV: 36,      // % da altura (nota da spec: 30–50 é sutil)
  curveH: 0,       // % da largura
  corner: 24,      // px
  shadow: true,
  vignette: 65,    // 0–100 (opacidade da vinheta)
  vignetteColor: 'rgba(0, 0, 0, 0.85)',
  controls: true,
};

/**
 * Player com silhueta "tela de cinema": bordas curvas via clip-path,
 * sombra que segue a silhueta (drop-shadow), vinheta interna e barra de
 * progresso curva (estimada para iframes).
 *
 * @param {{ src: string, type?: 'iframe'|'video', title?: string, allow?: string,
 *           poster?: string, progress?: number|null, children?: ReactNode,
 *           className?: string, style?: object, mediaRef?: React.Ref }} props
 *  - progress: 0..1 (estimado) — desenha barra curva na base; null oculta
 *  - mediaRef: ref anexada ao <iframe>/<video> interno (ex.: unmute via postMessage)
 */
export default function CinemaScreenVideo({
  src,
  type = 'iframe',
  title,
  allow,
  poster,
  progress = null,
  children,
  className,
  style,
  mediaRef,
  shape = DEFAULTS.shape,
  curveV = DEFAULTS.curveV,
  curveH = DEFAULTS.curveH,
  corner = DEFAULTS.corner,
  shadow = DEFAULTS.shadow,
  vignette = DEFAULTS.vignette,
  vignetteColor = DEFAULTS.vignetteColor,
  controls = DEFAULTS.controls,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ w: rect.width, h: rect.height });
      }
    };

    update();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fallback 16:9 até o primeiro measure (evita flash sem clip-path)
  const { w, h } = size || { w: 1280, h: 720 };
  const clipPath = buildCinemaPath(
    w,
    h,
    shape,
    (Math.min(curveV, 100) / 100) * h,
    (Math.min(curveH, 100) / 100) * w,
    corner,
  );

  const showProgress = controls && progress != null && size;

  const vignetteStyle = {
    opacity: Math.max(0, Math.min(100, vignette)) / 100,
    background: `radial-gradient(120% 120% at 50% 50%, transparent 52%, ${vignetteColor} 100%)`,
  };

  return (
    <div
      ref={containerRef}
      className={`cinema-video${className ? ` ${className}` : ''}`}
      style={{
        ...style,
        clipPath: `path('${clipPath}')`,
        WebkitClipPath: `path('${clipPath}')`,
        filter: shadow ? 'drop-shadow(0 20px 44px rgba(0, 0, 0, 0.45))' : undefined,
      }}
      aria-label={title}
    >
      {type === 'video' ? (
        <video
          ref={mediaRef}
          className="cinema-video__media"
          src={src}
          poster={poster}
          controls={controls}
          playsInline
        />
      ) : (
        <iframe
          ref={mediaRef}
          className="cinema-video__media"
          src={src}
          title={title}
          allow={allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'}
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}

      <div className="cinema-video__vignette" style={vignetteStyle} aria-hidden="true" />

      {showProgress && (
        <svg
          className="cinema-video__progress"
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Trilha fina seguindo a curva da base */}
          <path
            d={[
              `M ${Math.min(corner, w / 2) + 12} ${h - 10}`,
              `Q ${w / 2} ${h - 10 + (shape === 'convex' ? 1 : -1) * (Math.min(curveV, 100) / 100) * h} ${w - (Math.min(corner, w / 2) + 12)} ${h - 10}`,
            ].join(' ')}
            pathLength="100"
            fill="none"
            className="cinema-video__progress-track"
          />
          <path
            d={[
              `M ${Math.min(corner, w / 2) + 12} ${h - 10}`,
              `Q ${w / 2} ${h - 10 + (shape === 'convex' ? 1 : -1) * (Math.min(curveV, 100) / 100) * h} ${w - (Math.min(corner, w / 2) + 12)} ${h - 10}`,
            ].join(' ')}
            pathLength="100"
            fill="none"
            className="cinema-video__progress-bar"
            strokeDasharray="100"
            strokeDashoffset={100 - 100 * Math.max(0, Math.min(1, progress))}
          />
        </svg>
      )}

      {children}
    </div>
  );
}