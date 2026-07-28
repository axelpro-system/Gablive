import { useState, useEffect } from 'react';
import './TimeInput.css';

/**
 * Converte um total de segundos em partes { h, m, s } (strings vazias quando indefinido).
 * @param {number|string|null|undefined} total
 */
function toParts(total) {
  if (total === '' || total == null || Number.isNaN(Number(total))) {
    return { h: '', m: '', s: '' };
  }
  const t = Math.max(0, Math.floor(Number(total)));
  return {
    h: String(Math.floor(t / 3600)),
    m: String(Math.floor((t % 3600) / 60)),
    s: String(t % 60),
  };
}

/**
 * Serializa as partes de volta para segundos totais.
 * Retorna '' quando allowEmpty e todos os campos estão vazios (campo opcional).
 */
function partsToTotal(parts, allowEmpty) {
  const allEmpty = parts.h === '' && parts.m === '' && parts.s === '';
  if (allowEmpty && allEmpty) return '';
  const h = parseInt(parts.h, 10) || 0;
  const m = parseInt(parts.m, 10) || 0;
  const s = parseInt(parts.s, 10) || 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Entrada de tempo em horas / minutos / segundos que serializa para segundos totais.
 * O valor persistido continua sendo segundos (compatível com o schema).
 *
 * @param {Object} props
 * @param {number|string} props.value       - tempo atual em segundos
 * @param {(seconds: number|string) => void} props.onChange
 * @param {boolean} [props.allowEmpty=false] - permite deixar o campo vazio (retorna '')
 * @param {boolean} [props.showSeconds=true] - exibe o campo de segundos
 * @param {string}  [props.className]
 */
export default function TimeInput({ value, onChange, allowEmpty = false, showSeconds = true, className = '' }) {
  const [parts, setParts] = useState(() => toParts(value));

  // Ressincroniza quando o valor externo muda de fato (ex.: reset do formulário
  // após adicionar um item), sem atropelar o usuário enquanto ele digita.
  useEffect(() => {
    const localTotal = partsToTotal(parts, allowEmpty);
    if (String(value ?? '') !== String(localTotal)) {
      setParts(toParts(value));
    }
  }, [value]);

  const handle = (field, raw) => {
    const cleaned = raw === '' ? '' : String(Math.max(0, parseInt(raw, 10) || 0));
    const next = { ...parts, [field]: cleaned };
    setParts(next);
    onChange(partsToTotal(next, allowEmpty));
  };

  return (
    <div className={`time-input ${className}`} role="group" aria-label="Tempo (horas, minutos, segundos)">
      <div className="time-input-field">
        <input
          type="number"
          min="0"
          className="input"
          placeholder="0"
          value={parts.h}
          onChange={(e) => handle('h', e.target.value)}
          aria-label="Horas"
        />
        <span className="time-input-unit">h</span>
      </div>
      <div className="time-input-field">
        <input
          type="number"
          min="0"
          max="59"
          className="input"
          placeholder="0"
          value={parts.m}
          onChange={(e) => handle('m', e.target.value)}
          aria-label="Minutos"
        />
        <span className="time-input-unit">min</span>
      </div>
      {showSeconds && (
        <div className="time-input-field">
          <input
            type="number"
            min="0"
            max="59"
            className="input"
            placeholder="0"
            value={parts.s}
            onChange={(e) => handle('s', e.target.value)}
            aria-label="Segundos"
          />
          <span className="time-input-unit">s</span>
        </div>
      )}
    </div>
  );
}
