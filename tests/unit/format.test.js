/**
 * Unit tests for currency and datetime-local formatting.
 * Run: node --test tests/unit/format.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  toDatetimeLocalValue,
  fromDatetimeLocalValue,
} from '../../src/lib/format.js';

// Intl usa espaço não separável entre "R$" e o número.
const normalize = (s) => s.replace(/\s/g, ' ');

describe('formatCurrency', () => {
  it('formats BRL with thousands separator and decimal comma', () => {
    assert.equal(normalize(formatCurrency(1497)), 'R$ 1.497,00');
  });

  it('accepts numeric strings', () => {
    assert.equal(normalize(formatCurrency('497.5')), 'R$ 497,50');
  });

  it('returns empty string for null, undefined, empty and non-numeric values', () => {
    assert.equal(formatCurrency(null), '');
    assert.equal(formatCurrency(undefined), '');
    assert.equal(formatCurrency(''), '');
    assert.equal(formatCurrency('abc'), '');
  });

  it('formats zero instead of hiding it', () => {
    assert.equal(normalize(formatCurrency(0)), 'R$ 0,00');
  });
});

describe('toDatetimeLocalValue / fromDatetimeLocalValue', () => {
  it('round-trips a local wall-clock time without shifting hours', () => {
    const iso = fromDatetimeLocalValue('2026-10-01T20:00');
    assert.equal(toDatetimeLocalValue(iso), '2026-10-01T20:00');
  });

  it('keeps the local hour when only minutes change', () => {
    const original = fromDatetimeLocalValue('2026-10-01T20:00');
    const edited = toDatetimeLocalValue(original).replace(':00', ':15');
    assert.equal(toDatetimeLocalValue(fromDatetimeLocalValue(edited)), '2026-10-01T20:15');
  });

  it('shows the local time of a UTC instant', () => {
    const local = new Date(2026, 9, 1, 20, 0);
    assert.equal(toDatetimeLocalValue(local.toISOString()), '2026-10-01T20:00');
  });

  it('returns empty string for empty or invalid ISO', () => {
    assert.equal(toDatetimeLocalValue(null), '');
    assert.equal(toDatetimeLocalValue(''), '');
    assert.equal(toDatetimeLocalValue('not-a-date'), '');
  });

  it('returns null for an empty or invalid input value', () => {
    assert.equal(fromDatetimeLocalValue(''), null);
    assert.equal(fromDatetimeLocalValue(undefined), null);
    assert.equal(fromDatetimeLocalValue('garbage'), null);
  });
});
