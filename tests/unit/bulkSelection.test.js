/**
 * Unit tests for bulk selection helpers used by Interactions (Chat, Oferta, Vendas).
 * Run: node --test tests/unit/bulkSelection.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toggleSelection,
  toggleSelectAll,
  filterOutIds,
  countSelected,
  areAllSelected,
  areSomeSelected,
  selectedIdList,
  buildBulkDeleteConfirmMessage,
  chunkIds,
} from '../../src/lib/bulkSelection.js';

describe('toggleSelection', () => {
  it('adds an id that is not selected', () => {
    const next = toggleSelection(new Set(), 'a');
    assert.equal(next.has('a'), true);
    assert.equal(next.size, 1);
  });

  it('removes an id that is already selected', () => {
    const next = toggleSelection(new Set(['a', 'b']), 'a');
    assert.equal(next.has('a'), false);
    assert.equal(next.has('b'), true);
  });

  it('does not mutate the original set', () => {
    const original = new Set(['a']);
    toggleSelection(original, 'b');
    assert.equal(original.has('b'), false);
    assert.equal(original.size, 1);
  });
});

describe('toggleSelectAll', () => {
  it('selects every id when none or some are selected', () => {
    const ids = ['a', 'b', 'c'];
    const next = toggleSelectAll(new Set(['a']), ids);
    assert.deepEqual([...next].sort(), ['a', 'b', 'c']);
  });

  it('clears selection when every id is already selected', () => {
    const ids = ['a', 'b'];
    const next = toggleSelectAll(new Set(['a', 'b']), ids);
    assert.equal(next.size, 0);
  });

  it('returns empty set when there are no items', () => {
    const next = toggleSelectAll(new Set(['stale']), []);
    assert.equal(next.size, 0);
  });
});

describe('filterOutIds', () => {
  it('removes items whose id is in the removal set', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const next = filterOutIds(items, new Set(['a', 'c']));
    assert.deepEqual(next.map((i) => i.id), ['b']);
  });

  it('accepts an array of ids', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const next = filterOutIds(items, [2]);
    assert.deepEqual(next.map((i) => i.id), [1]);
  });

  it('returns the original list when nothing matches', () => {
    const items = [{ id: 'a' }];
    const next = filterOutIds(items, new Set(['z']));
    assert.deepEqual(next, items);
  });
});

describe('selection counts', () => {
  it('counts only ids that still exist in the list', () => {
    assert.equal(countSelected(['a', 'b'], new Set(['a', 'gone'])), 1);
  });

  it('reports all selected only when every current id is selected', () => {
    assert.equal(areAllSelected(['a', 'b'], new Set(['a', 'b'])), true);
    assert.equal(areAllSelected(['a', 'b'], new Set(['a'])), false);
    assert.equal(areAllSelected([], new Set()), false);
  });

  it('reports partial selection for the indeterminate checkbox', () => {
    assert.equal(areSomeSelected(['a', 'b'], new Set(['a'])), true);
    assert.equal(areSomeSelected(['a', 'b'], new Set(['a', 'b'])), false);
    assert.equal(areSomeSelected(['a', 'b'], new Set()), false);
  });

  it('returns selected ids in list order', () => {
    assert.deepEqual(selectedIdList(['c', 'a', 'b'], new Set(['b', 'c'])), ['c', 'b']);
  });
});

describe('buildBulkDeleteConfirmMessage', () => {
  it('returns null when nothing is selected', () => {
    assert.equal(buildBulkDeleteConfirmMessage('chat', 0), null);
  });

  it('uses singular and plural labels per interaction kind', () => {
    assert.match(buildBulkDeleteConfirmMessage('chat', 1), /1 mensagem/);
    assert.match(buildBulkDeleteConfirmMessage('chat', 3), /3 mensagens/);
    assert.match(buildBulkDeleteConfirmMessage('cta', 1), /1 oferta/);
    assert.match(buildBulkDeleteConfirmMessage('cta', 2), /2 ofertas/);
    assert.match(buildBulkDeleteConfirmMessage('sales', 1), /1 venda/);
    assert.match(buildBulkDeleteConfirmMessage('sales', 4), /4 vendas/);
  });
});

describe('chunkIds', () => {
  it('splits a long id list into chunks of the given size', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    assert.deepEqual(chunkIds(ids, 2), [['a', 'b'], ['c', 'd'], ['e']]);
  });

  it('returns an empty array for an empty list', () => {
    assert.deepEqual(chunkIds([]), []);
  });
});
