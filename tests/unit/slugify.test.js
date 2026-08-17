/**
 * Unit tests for public slug + video URL helpers.
 * Run: node --test tests/unit/slugify.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectVideoPlatform,
  looksLikeVideoUrl,
  normalizeVideoUrl,
  slugBaseFromTitle,
} from '../../src/lib/slugify.js';

describe('looksLikeVideoUrl', () => {
  it('accepts YouTube and Vimeo hosts', () => {
    assert.equal(looksLikeVideoUrl('https://youtu.be/abc123'), true);
    assert.equal(looksLikeVideoUrl('https://vimeo.com/123456'), true);
  });

  it('rejects a normal title', () => {
    assert.equal(looksLikeVideoUrl('Lançamento do produto'), false);
  });
});

describe('detectVideoPlatform', () => {
  it('detects Vimeo from the host', () => {
    assert.equal(detectVideoPlatform('https://vimeo.com/123456'), 'vimeo');
  });

  it('defaults to YouTube', () => {
    assert.equal(detectVideoPlatform('https://www.youtube.com/watch?v=abc123'), 'youtube');
    assert.equal(detectVideoPlatform(''), 'youtube');
  });
});

describe('normalizeVideoUrl', () => {
  it('adds https to protocol-less YouTube and Vimeo hosts', () => {
    assert.equal(normalizeVideoUrl('youtu.be/abc123'), 'https://youtu.be/abc123');
    assert.equal(normalizeVideoUrl('www.youtube.com/watch?v=abc123'), 'https://www.youtube.com/watch?v=abc123');
    assert.equal(normalizeVideoUrl('vimeo.com/123456'), 'https://vimeo.com/123456');
  });

  it('keeps a full URL and empty values', () => {
    assert.equal(normalizeVideoUrl('https://youtu.be/abc123'), 'https://youtu.be/abc123');
    assert.equal(normalizeVideoUrl(''), '');
  });
});

describe('slugBaseFromTitle', () => {
  it('slugifies a regular title', () => {
    assert.equal(slugBaseFromTitle('Análise de System Design'), 'analise-de-system-design');
  });

  it('does not use a raw video URL as the public slug', () => {
    assert.equal(
      slugBaseFromTitle('https://www.youtube.com/watch?v=dQw4w9wgwXc'),
      'video-dqw4w9wgwxc'
    );
  });
});
