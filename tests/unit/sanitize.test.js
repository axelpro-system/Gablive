/**
 * Unit tests for input sanitization/validation helpers.
 * Run: node --test tests/unit/sanitize.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidPhone } from '../../src/lib/sanitize.js';

describe('isValidPhone', () => {
  it('accepts common Brazilian formats', () => {
    assert.equal(isValidPhone('(11) 98765-4321'), true);
    assert.equal(isValidPhone('+55 11 98765-4321'), true);
    assert.equal(isValidPhone('11987654321'), true);
  });

  it('rejects empty or non-numeric input', () => {
    assert.equal(isValidPhone(''), false);
    assert.equal(isValidPhone('not a phone'), false);
    assert.equal(isValidPhone(null), false);
  });

  it('rejects too few or too many digits', () => {
    assert.equal(isValidPhone('123456'), false);
    assert.equal(isValidPhone('1234567890123456'), false);
  });
});
