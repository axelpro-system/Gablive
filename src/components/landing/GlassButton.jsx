import { Link } from 'react-router-dom';
import './GlassButton.css';

/* ============================================
   GLASS BUTTON — Glassy / frosted button
   Hover + pressed states, editable icon color
   and stroke width. Works with any lucide icon.
   ============================================ */

/**
 * @param {object} props
 * @param {React.ReactNode} props.children      Button label
 * @param {React.ComponentType<any>} [props.icon] Lucide icon component (optional)
 * @param {'left'|'right'} [props.iconPosition] Icon side (default 'right')
 * @param {string} [props.iconColor]            Icon color (default 'currentColor')
 * @param {number} [props.strokeWidth]          Icon stroke width (default 2)
 * @param {number} [props.iconSize]             Icon size in px (default 18)
 * @param {'default'|'accent'} [props.variant]  Visual variant (default 'default')
 * @param {string} [props.to]                   react-router path -> renders <Link>
 * @param {string} [props.href]                 URL -> renders <a>
 * @param {() => void} [props.onClick]          Click handler -> renders <button>
 * @param {string} [props.className]            Extra classes
 */
export default function GlassButton({
  children,
  icon: Icon,
  iconPosition = 'right',
  iconColor = 'currentColor',
  strokeWidth = 2,
  iconSize = 18,
  variant = 'default',
  to,
  href,
  onClick,
  className = '',
  ...rest
}) {
  const classes = `glass-btn glass-btn--${variant} ${className}`.trim();

  const iconEl = Icon ? (
    <Icon
      size={iconSize}
      color={iconColor}
      strokeWidth={strokeWidth}
      className="glass-btn__icon"
      aria-hidden="true"
    />
  ) : null;

  const inner = (
    <>
      <span className="glass-btn__shine" aria-hidden="true" />
      {iconPosition === 'left' && iconEl}
      <span className="glass-btn__label">{children}</span>
      {iconPosition === 'right' && iconEl}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick} {...rest}>
      {inner}
    </button>
  );
}
