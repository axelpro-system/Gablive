import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

function SelectAllCheckbox({ checked, indeterminate, onChange, label }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <label className="bulk-select-all">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        aria-checked={indeterminate ? 'mixed' : checked}
      />
      <span>{label}</span>
    </label>
  );
}

export default function BulkSelectBar({
  total,
  selectedCount,
  allSelected,
  someSelected,
  onToggleAll,
  onDelete,
  deleting = false,
}) {
  if (!total) return null;

  const selectLabel = allSelected ? 'Desmarcar todos' : 'Selecionar todos';

  return (
    <div className="bulk-select-bar" role="group" aria-label="Seleção em massa">
      <SelectAllCheckbox
        checked={allSelected}
        indeterminate={someSelected}
        onChange={onToggleAll}
        label={selectLabel}
      />
      {selectedCount > 0 && (
        <span className="bulk-select-count">{selectedCount} selecionado{selectedCount === 1 ? '' : 's'}</span>
      )}
      <button
        type="button"
        className="btn btn-sm btn-danger"
        disabled={selectedCount === 0 || deleting}
        onClick={onDelete}
        aria-busy={deleting || undefined}
      >
        {deleting ? (
          <span className="spinner spinner-sm" aria-hidden="true" />
        ) : (
          <Trash2 size={14} aria-hidden="true" />
        )}
        Apagar selecionados
        {selectedCount > 0 ? ` (${selectedCount})` : ''}
      </button>
    </div>
  );
}
