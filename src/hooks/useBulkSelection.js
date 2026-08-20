import { useCallback, useMemo, useState } from 'react';
import {
  areAllSelected,
  areSomeSelected,
  countSelected,
  selectedIdList,
  toggleSelectAll,
  toggleSelection,
} from '../lib/bulkSelection.js';

/**
 * Selection state for a list of { id } items.
 * Stale ids (deleted elsewhere) are ignored by counts and the id list.
 */
export default function useBulkSelection(items = []) {
  const [selected, setSelected] = useState(() => new Set());
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const toggle = useCallback((id) => {
    setSelected((prev) => toggleSelection(prev, id));
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => toggleSelectAll(prev, itemIds));
  }, [itemIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const selectedIds = useMemo(
    () => selectedIdList(itemIds, selected),
    [itemIds, selected],
  );
  const selectedCount = countSelected(itemIds, selected);
  const allSelected = areAllSelected(itemIds, selected);
  const someSelected = areSomeSelected(itemIds, selected);

  return {
    selected,
    selectedIds,
    selectedCount,
    allSelected,
    someSelected,
    toggle,
    toggleAll,
    clear,
  };
}
