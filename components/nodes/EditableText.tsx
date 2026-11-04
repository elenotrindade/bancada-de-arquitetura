'use client';
import { useEffect, useRef } from 'react';
import { useBoard } from '@/lib/store';

/** Texto que vira campo de edição com duplo clique (ou logo ao criar). */
export default function EditableText({ id, text, placeholder }: { id: string; text: string; placeholder: string }) {
  const editing = useBoard(s => s.editingId === id);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      useBoard.getState().snapshot();
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="n-edit nodrag nowheel"
        defaultValue={text}
        aria-label="Texto"
        onChange={e => useBoard.getState().updateNodeData(id, { text: e.target.value })}
        onBlur={() => useBoard.getState().setEditing(null)}
        onKeyDown={e => {
          e.stopPropagation();
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); useBoard.getState().setEditing(null); }
        }}
      />
    );
  }
  return <>{text || <span>{placeholder}</span>}</>;
}
