/**
 * Pure helpers for bulk selection in Interactions (Chat, Oferta, Vendas).
 * Selection is a Set of item ids. Mutations always return a new Set/array.
 */

const KIND_LABELS = {
  chat: { singular: 'mensagem', plural: 'mensagens' },
  cta: { singular: 'oferta', plural: 'ofertas' },
  sales: { singular: 'venda', plural: 'vendas' },
};

export function toggleSelection(selectedIds, id) {
  const next = new Set(selectedIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function toggleSelectAll(selectedIds, itemIds) {
  const ids = Array.isArray(itemIds) ? itemIds : [];
  if (ids.length === 0) return new Set();
  const allSelected = ids.every((id) => selectedIds.has(id));
  return allSelected ? new Set() : new Set(ids);
}

export function filterOutIds(items, idsToRemove) {
  const remove = idsToRemove instanceof Set ? idsToRemove : new Set(idsToRemove || []);
  if (remove.size === 0) return items;
  return items.filter((item) => !remove.has(item.id));
}

export function countSelected(itemIds, selectedIds) {
  return itemIds.filter((id) => selectedIds.has(id)).length;
}

export function areAllSelected(itemIds, selectedIds) {
  return itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));
}

export function areSomeSelected(itemIds, selectedIds) {
  return countSelected(itemIds, selectedIds) > 0 && !areAllSelected(itemIds, selectedIds);
}

export function selectedIdList(itemIds, selectedIds) {
  return itemIds.filter((id) => selectedIds.has(id));
}

export function buildBulkDeleteConfirmMessage(kind, count) {
  const n = Number(count) || 0;
  if (n <= 0) return null;
  const labels = KIND_LABELS[kind] || KIND_LABELS.chat;
  const noun = n === 1 ? labels.singular : labels.plural;
  return `Excluir ${n} ${noun} selecionada${n === 1 ? '' : 's'}? Esta ação não pode ser desfeita.`;
}

export const BULK_DELETE_CHUNK_SIZE = 100;

export function chunkIds(ids, size = BULK_DELETE_CHUNK_SIZE) {
  const list = Array.isArray(ids) ? ids : [...(ids || [])];
  const chunkSize = Math.max(1, Number(size) || BULK_DELETE_CHUNK_SIZE);
  const chunks = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    chunks.push(list.slice(i, i + chunkSize));
  }
  return chunks;
}
