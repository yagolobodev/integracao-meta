import { useState } from 'react';
import { maskClid } from '../utils.js';

export default function MaskedClid({ clid }) {
  const [revealed, setRevealed] = useState(false);

  if (!clid) return <span className="text-slate-600">—</span>;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      {revealed ? clid : maskClid(clid)}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setRevealed((v) => !v);
        }}
        className="rounded px-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
      >
        {revealed ? 'ocultar' : 'revelar'}
      </button>
    </span>
  );
}
